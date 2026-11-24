#!/usr/bin/env bash
# Tests of agent-gate in a throwaway HOME: the allowed forms, the refused ones,
# and proxy.env read for deploy and check only. deploy/deploy.sh, systemctl,
# journalctl and curl are stubs that print their arguments.
#   deploy/agent-gate/test.sh
set -uo pipefail

GATE=$(cd "$(dirname "$0")" && pwd)/agent-gate
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
export HOME=$T/home
mkdir -p "$HOME/opt/node/bin" "$HOME/.config/starryai-apps"
for c in systemctl journalctl curl; do
  printf '#!/bin/sh\necho "%s $*"\n' "$c" >"$HOME/opt/node/bin/$c"
  chmod 755 "$HOME/opt/node/bin/$c"
done
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

# a source repo (the VM's side) with a stub deploy.sh
src=$T/src
git init -q -b main "$src"
mkdir -p "$src/deploy"
printf '#!/bin/sh\necho "deploy.sh $* http_proxy=${http_proxy:-} HTTPS_PROXY=${HTTPS_PROXY:-}"\n' >"$src/deploy/deploy.sh"
chmod 755 "$src/deploy/deploy.sh"
git -C "$src" add -A && git -C "$src" commit -qm one
c1=$(git -C "$src" rev-parse HEAD)

fails=0
# run <name> <expected exit> <expected output (grep -E)> <gate args...> ; SSH_ORIGINAL_COMMAND in $CMD
run() {
  local name=$1 want=$2 pat=$3 out code
  shift 3
  out=$(SSH_ORIGINAL_COMMAND=$CMD "$GATE" "$@" 2>&1 </dev/null)
  code=$?
  if [ "$code" = "$want" ] && grep -qE -- "$pat" <<<"$out"; then
    echo "ok   $name"
  else
    echo "FAIL $name: exit $code (want $want), output:"; sed 's/^/     /' <<<"$out"
    fails=$((fails + 1))
  fi
}

# ---- bundle-in ----
git -C "$src" bundle create -q "$T/one.bundle" --all
out=$(SSH_ORIGINAL_COMMAND="bundle-in wpd-auto" "$GATE" <"$T/one.bundle" 2>&1)
grep -q "bundle/main" <<<"$out" && echo "ok   bundle-in clones" || { echo "FAIL bundle-in clones: $out"; fails=$((fails + 1)); }
echo two >"$src/x" && git -C "$src" add -A && git -C "$src" commit -qm two
c2=$(git -C "$src" rev-parse HEAD)
git -C "$src" bundle create -q "$T/two.bundle" --all
out=$(SSH_ORIGINAL_COMMAND="bundle-in wpd-auto" "$GATE" <"$T/two.bundle" 2>&1)
grep -q "${c2:0:7} bundle/main" <<<"$out" && echo "ok   bundle-in fetches" || { echo "FAIL bundle-in fetches: $out"; fails=$((fails + 1)); }
echo junk >"$T/junk.bundle"
out=$(SSH_ORIGINAL_COMMAND="bundle-in wpd-auto" "$GATE" <"$T/junk.bundle" 2>&1); [ $? -ne 0 ] && echo "ok   bundle-in refuses junk" || { echo "FAIL junk accepted"; fails=$((fails + 1)); }

# ---- refused forms ----
CMD=""                                 run "empty" 2 "usage"
CMD="bash"                             run "a shell" 2 "not allowed: bash"
CMD="rm -rf /"                         run "rm" 2 "not allowed"
CMD="status;id"                        run "semicolon" 2 "not allowed: status;id"
CMD='status $(id)'                     run "substitution" 2 'not allowed: \$\(id\)'
CMD='status `id`'                      run "backquote" 2 "not allowed"
CMD="status | id"                      run "pipe" 2 "not allowed: \|"
CMD=$'status\nid'                      run "two lines" 2 "one line only"
CMD="logs sshd"                        run "other unit" 2 "not our unit"
CMD="history ../etc"                   run "path as repo" 2 "unknown repo"
CMD="history wpd-auto x"               run "bad count" 2 "not a count"
CMD="deploy wpd-auto staging main"     run "branch, not commit" 2 "not a commit"
CMD="deploy wpd-auto staging @staging" run "staging @staging" 2 "takes a commit"
CMD="deploy wpd-auto production $c2"   run "production commit" 2 "deploy <repo> staging"
CMD="deploy wpd-auto production @staging" run "agent: production" 2 "operator"
CMD="--operator status"                run "--operator from the client" 2 "not allowed: --operator status"

# ---- allowed forms ----
cat >"$HOME/.config/starryai-apps/proxy.env" <<'EOF'
# the site's proxy
export http_proxy=http://proxy.example:8080
HTTPS_PROXY="http://proxy.example:8080"
no_proxy=localhost,127.0.0.1,.example.jp
EOF
chmod 600 "$HOME/.config/starryai-apps/proxy.env"
CMD="deploy wpd-auto staging ${c1:0:7}" run "staging: old commit, proxy" 0 "deploy.sh staging $c1 http_proxy=http://proxy.example:8080 HTTPS_PROXY=http://proxy.example:8080"
[ "$(git -C "$HOME/deploy/wpd-auto" rev-parse HEAD)" = "$c1" ] && echo "ok   checkout is the commit" || { echo "FAIL checkout"; fails=$((fails + 1)); }
CMD="deploy wpd-auto staging $c2"      run "staging: new commit" 0 "deploy.sh staging $c2 http_proxy=http"
CMD="deploy wpd-auto production @staging" run "operator: production" 0 "deploy.sh production @staging http_proxy=http" --operator
CMD="history wpd-auto"                 run "history, no proxy" 0 "^deploy.sh history 20 http_proxy= HTTPS_PROXY=$"
CMD="history wpd-auto 5"               run "history n" 0 "deploy.sh history 5 "
CMD="check wpd-auto"                   run "check, proxy" 0 "deploy.sh check http_proxy=http://proxy"
CMD="status"                           run "status" 0 "curl .*http://127.0.0.1/sd-staging/VERSION.txt"
CMD="logs wpd-auto-backend-staging 50" run "logs" 0 "journalctl --user -u wpd-auto-backend-staging -n 50 --no-pager"
CMD="deploy starry-digitizer staging $c2" run "unknown checkout" 2 "no such commit"
CMD="deploy wpd-auto staging deadbeef"  run "unknown commit" 2 "no such commit"

# ---- a tag named like a short commit id does not redirect a deploy ----
git -C "$src" tag "${c2:0:7}" "$c1"
git -C "$src" bundle create -q "$T/tag.bundle" --all
SSH_ORIGINAL_COMMAND="bundle-in wpd-auto" "$GATE" <"$T/tag.bundle" >/dev/null 2>&1
[ -z "$(git -C "$HOME/deploy/wpd-auto" tag)" ] && echo "ok   bundle-in takes no tags" || { echo "FAIL tags fetched"; fails=$((fails + 1)); }
[ -z "$(ls "$HOME/incoming")" ] && echo "ok   bundle removed after fetch" || { echo "FAIL bundle left"; fails=$((fails + 1)); }
CMD="deploy wpd-auto staging ${c2:0:7}" run "short id is the commit" 0 "deploy.sh staging $c2 "
git -C "$HOME/deploy/wpd-auto" tag "${c2:0:8}" "$c1"
CMD="deploy wpd-auto staging ${c2:0:8}" run "a ref of that name is refused" 2 "not a commit id here"

# ---- proxy.env: refused when bad, never read outside deploy and check ----
echo 'http_proxy=$(id)' >"$HOME/.config/starryai-apps/proxy.env"
CMD="deploy wpd-auto staging $c2"      run "proxy.env as data" 2 "not a proxy line"
CMD="history wpd-auto"                 run "bad proxy.env: history still runs" 0 "deploy.sh history"
echo 'http_proxy=http://p:1' >"$HOME/.config/starryai-apps/proxy.env"
chmod 644 "$HOME/.config/starryai-apps/proxy.env"
CMD="deploy wpd-auto staging $c2"      run "proxy.env readable by others" 2 "chmod 600"

# ---- the log ----
grep -q "operator deploy wpd-auto production @staging" "$HOME/.local/state/agent-gate.log" &&
  grep -q "agent deploy wpd-auto production @staging" "$HOME/.local/state/agent-gate.log" &&
  grep -q "agent status;id" "$HOME/.local/state/agent-gate.log" &&
  grep -q 'agent status?id' "$HOME/.local/state/agent-gate.log" &&
  echo "ok   log has role and command, refused ones too" || { echo "FAIL log"; fails=$((fails + 1)); }

echo "$fails failed"
[ "$fails" = 0 ]
