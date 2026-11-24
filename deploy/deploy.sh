#!/usr/bin/env bash
# Deploys a commit (default HEAD) of starry-digitizer to this machine, as the
# static page next to wpd-auto on the same nginx (docs/design/starryai-auto.md
# §4). The page calls the wpd-auto backend that is already there, on the same
# origin; this script installs no service of its own.
# Run as the user that owns the web dirs (not root). Idempotent.
#
#   deploy/deploy.sh staging [<commit>]     # <site>/sd-staging/
#   deploy/deploy.sh production [<commit>]  # <site>/sd/
#   deploy/deploy.sh production @staging    # the commit staging has, rebuilt for production
#   deploy/deploy.sh history [<n>]          # the deploys so far (the last n)
#   deploy/deploy.sh check                  # the site settings and the nginx locations; changes nothing
#   deploy/deploy.sh render <dir>           # the nginx locations into <dir>/nginx/
#
# Site settings (this host's, never in git): ${STARRY_DIGITIZER_SITE:-~/.config/starry-digitizer/site.env},
# KEY=value lines of the keys below, read as data (never run as shell): a
# value is one word or "quoted", optionally followed by a # comment.
#
#   required  STARRY_DIGITIZER_WEB_DIR          production: www -> releases/<commit>/
#             STARRY_DIGITIZER_STAGING_WEB_DIR  staging, the same
#   optional  STARRY_DIGITIZER_API_URL          default /wpd-auto/api/v1
#             STARRY_DIGITIZER_STAGING_API_URL  default /wpd-auto-staging/api/v1
#             STARRY_DIGITIZER_APP_DIR          lock, build counter, history
#                                               (default ~/.local/share/starry-digitizer)
#
# A deploy builds `git archive <commit>` (uncommitted changes are not
# deployed) with yarn and vite, for the target's path and API, writes
# VERSION.txt (commit, version, build, environment, deployed), switches the
# web dir's `www` link at once, and keeps the current and the previous
# release. One line per deploy goes to <app dir>/deploy-history.log.
set -euo pipefail

die() { echo "deploy: $*" >&2; exit 1; }

REPO=$(cd "$(dirname "$0")/.." && pwd)
SITE=${STARRY_DIGITIZER_SITE:-$HOME/.config/starry-digitizer/site.env}
YARN=(npx --yes yarn@1.22.22)
KEYS=(STARRY_DIGITIZER_WEB_DIR STARRY_DIGITIZER_STAGING_WEB_DIR
  STARRY_DIGITIZER_API_URL STARRY_DIGITIZER_STAGING_API_URL STARRY_DIGITIZER_APP_DIR)

# site.env as data: KEY=value, known keys only, each once
declare -A site=()
read_site() {
  local n=0 line key value
  [ -r "$SITE" ] || die "$SITE: not found (copy deploy/site.env.example there)"
  while IFS= read -r line || [ -n "$line" ]; do
    n=$((n + 1))
    [[ $line != *$'\r' ]] || die "$SITE:$n: CRLF line ending"
    [[ $line =~ ^[[:space:]]*(#.*)?$ ]] && continue
    [[ $line =~ ^([A-Z_]+)=(\"([^\"\`\\]*)\"|([A-Za-z0-9._/:~-]*))([[:space:]]+#.*|[[:space:]]*)$ ]] ||
      die "$SITE:$n: not KEY=value (one word or \"quoted\"): $line"
    key=${BASH_REMATCH[1]}
    value=${BASH_REMATCH[3]}${BASH_REMATCH[4]}
    [[ " ${KEYS[*]} " == *" $key "* ]] || die "$SITE:$n: unknown key $key"
    [ -z "${site[$key]+x}" ] || die "$SITE:$n: $key is given twice"
    site[$key]=$value
  done <"$SITE"
  for key in STARRY_DIGITIZER_WEB_DIR STARRY_DIGITIZER_STAGING_WEB_DIR; do
    [ -n "${site[$key]:-}" ] || die "$SITE: $key is required"
  done
  local d
  for key in STARRY_DIGITIZER_WEB_DIR STARRY_DIGITIZER_STAGING_WEB_DIR STARRY_DIGITIZER_APP_DIR; do
    d=${site[$key]:-}
    d=${d/#\~/$HOME}
    [ -z "$d" ] || [[ $d =~ ^/[A-Za-z0-9._/-]+$ ]] || die "$SITE: $key: an absolute path of A-Z a-z 0-9 . _ / - only"
    [ -z "$d" ] || site[$key]=$d
  done
  [ "${site[STARRY_DIGITIZER_WEB_DIR]}" != "${site[STARRY_DIGITIZER_STAGING_WEB_DIR]}" ] ||
    die "$SITE: production and staging need different web dirs"
  APP_DIR=${site[STARRY_DIGITIZER_APP_DIR]:-$HOME/.local/share/starry-digitizer}
}

set_target() {
  case $1 in
    production)
      TARGET=production PREFIX=/sd/
      WEB_DIR=${site[STARRY_DIGITIZER_WEB_DIR]}
      API_URL=${site[STARRY_DIGITIZER_API_URL]:-/wpd-auto/api/v1} ;;
    staging)
      TARGET=staging PREFIX=/sd-staging/
      WEB_DIR=${site[STARRY_DIGITIZER_STAGING_WEB_DIR]}
      API_URL=${site[STARRY_DIGITIZER_STAGING_API_URL]:-/wpd-auto-staging/api/v1} ;;
    *) die "unknown target: $1 (production or staging)" ;;
  esac
}

render_nginx() {
  mkdir -p "$1/nginx"
  sed -e "s#@WEB_DIR@#${site[STARRY_DIGITIZER_WEB_DIR]}#g" \
    -e "s#@STAGING_WEB_DIR@#${site[STARRY_DIGITIZER_STAGING_WEB_DIR]}#g" \
    "$REPO/deploy/nginx/starry-digitizer.conf" >"$1/nginx/starry-digitizer.conf"
  echo "wrote $1/nginx/starry-digitizer.conf"
}

# the line of VERSION.txt that starts with $2=
version_field() { sed -n "s/^$2=//p" "$1" 2>/dev/null | head -n 1; }

deploy() {
  local ref=$1 commit version build release previous
  if [ "$ref" = @staging ]; then
    set_target staging
    commit=$(head -n 1 "$WEB_DIR/www/VERSION.txt" 2>/dev/null) || die "staging has no VERSION.txt"
    build=$(version_field "$WEB_DIR/www/VERSION.txt" build)
    [[ $commit =~ ^[0-9a-f]{40}$ && $build =~ ^[0-9]+$ ]] || die "staging's VERSION.txt is not readable"
    set_target production
  else
    commit=$(git -C "$REPO" rev-parse --verify "$ref^{commit}") || die "no such commit: $ref"
    build=
  fi
  [ -d "$WEB_DIR" ] || die "$WEB_DIR does not exist (sudo install -d -o \$USER -m 755 $WEB_DIR)"
  mkdir -p "$APP_DIR"
  exec 9>"$APP_DIR/deploy.lock"
  flock -n 9 || die "another deploy is running"
  if [ -z "$build" ]; then
    build=$(($(cat "$APP_DIR/build-number" 2>/dev/null || echo 0) + 1))
    echo "$build" >"$APP_DIR/build-number"
  fi

  # INFO: global, for the EXIT trap
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  git -C "$REPO" archive "$commit" | tar -x -C "$tmp"
  # INFO: yarn writes registry.yarnpkg.com into yarn.lock, which starryai
  # cannot reach (registry.npmjs.org it can). Both serve the same tarballs and
  # yarn still checks each one against the lockfile's integrity hash.
  sed -i 's#https://registry\.yarnpkg\.com/#https://registry.npmjs.org/#g' "$tmp/yarn.lock"
  version=$(node -p "require('$tmp/package.json').version")
  echo "deploy: $TARGET, $commit (version $version, build $build)"
  (
    cd "$tmp"
    PUPPETEER_SKIP_DOWNLOAD=1 CYPRESS_INSTALL_BINARY=0 "${YARN[@]}" install --frozen-lockfile --ignore-scripts
    STARRY_DIGITIZER_PWA=off STARRY_DIGITIZER_ANALYTICS=off \
      VITE_OCR_ASSET_DIR=tesseract VITE_AUTO_SERVICE_URL="$API_URL" \
      VITE_APP_COMMIT="$commit" VITE_APP_BUILD="$build" \
      npx vite build --base="$PREFIX" --outDir "$tmp/dist"
  )
  printf '%s\nversion=%s\nbuild=%s\nenvironment=%s\ndeployed=%s\n' \
    "$commit" "$version" "$build" "$TARGET" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$tmp/dist/VERSION.txt"

  release="$WEB_DIR/releases/$commit-$build"
  mkdir -p "$WEB_DIR/releases"
  rm -rf "$release"
  cp -r "$tmp/dist" "$release"
  chmod -R a+rX "$release"
  previous=$(readlink "$WEB_DIR/www" 2>/dev/null || true)
  ln -sfn "$release" "$WEB_DIR/.www.new"
  mv -T "$WEB_DIR/.www.new" "$WEB_DIR/www"
  # INFO: keep the current and the previous release
  local r
  for r in "$WEB_DIR"/releases/*; do
    [ "$r" = "$release" ] || [ "$r" = "$previous" ] || rm -rf "$r"
  done

  local result=ok
  if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1$PREFIX" 2>/dev/null; then
    [ "$(curl -fsS --max-time 5 "http://127.0.0.1${PREFIX}VERSION.txt" | head -n 1)" = "$commit" ] ||
      result=served-other
  else
    result=not-served
    echo "deploy: nginx does not answer for $PREFIX on 127.0.0.1 (deploy/README.md)" >&2
  fi
  printf '%s %s %s %s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TARGET" "$commit" \
    "$version" "$build" "$result" >>"$APP_DIR/deploy-history.log"
  echo "deploy: $TARGET is $commit (build $build): $result"
  [ "$result" = ok ]
}

cmd=${1:-production}
case $cmd in
  production | staging)
    read_site
    set_target "$cmd"
    deploy "${2:-HEAD}" ;;
  history)
    read_site
    tail -n "${2:-20}" "$APP_DIR/deploy-history.log" 2>/dev/null || echo "no deploys yet" ;;
  check)
    read_site
    for k in "${KEYS[@]}"; do printf '%-34s %s\n' "$k" "${site[$k]:-(default)}"; done
    echo "app dir: $APP_DIR"
    if command -v node >/dev/null; then
      [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || echo "too old: node $(node --version) (22 or later)"
    else
      echo "missing: node (22 or later)"
    fi
    command -v flock >/dev/null || echo "missing: flock"
    tmp=$(mktemp -d)
    render_nginx "$tmp" && cat "$tmp/nginx/starry-digitizer.conf" && rm -rf "$tmp" ;;
  render)
    [ -n "${2:-}" ] || die "render <dir>"
    read_site
    render_nginx "$2" ;;
  *) die "unknown command: $cmd (staging, production, history, check, render)" ;;
esac
