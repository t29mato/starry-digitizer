// INFO: builds a tarball whose version carries the commit it was built from:
//
//     starry-digitizer-2.0.0-dev-<short sha>.tgz
//
// The library is not published to npm — hosts vendor the tarball into their own
// repository (docs/embedding.rst). During development the same version number
// therefore gets handed out more than once with different contents, and the
// file name in the host's vendor/ stops identifying what is actually installed.
// Stamping the commit into the version makes every hand-off self-identifying.
//
// package.json in git keeps the plain version; this script writes the stamped
// one, packs, and puts the file back, so the working tree is unchanged
// afterwards even if the pack fails.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const PKG = 'package.json'
const original = readFileSync(PKG, 'utf8')
const { version } = JSON.parse(original)

const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
  encoding: 'utf8',
}).trim()

// INFO: a dirty tree would produce a tarball that no commit reproduces, which
// is exactly the confusion this script exists to prevent.
const dirty = execFileSync('git', ['status', '--porcelain'], {
  encoding: 'utf8',
}).trim()
if (dirty && !process.argv.includes('--allow-dirty')) {
  console.error(
    `pack-dev: the working tree is dirty, so "${version}-dev-${sha}" would not\n` +
      `identify what is in the tarball. Commit first, or pass --allow-dirty.\n\n${dirty}`,
  )
  process.exit(1)
}

const stamped = `${version}-dev-${sha}`
writeFileSync(
  PKG,
  original.replace(`"version": "${version}"`, `"version": "${stamped}"`),
)
try {
  execFileSync('npm', ['pack'], { stdio: 'inherit' })
} finally {
  writeFileSync(PKG, original)
}
console.log(`\npack-dev: starry-digitizer-${stamped}.tgz`)
