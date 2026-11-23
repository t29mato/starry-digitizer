// INFO: SHA-256 in plain TypeScript. The starryai pages are served over
// http, where `crypto.subtle` does not exist (it is for secure contexts
// only), and the image store is keyed by the sha256 of the file. About 0.1 s
// for 10 MB, which is the largest image the backend takes.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/** The sha256 of `bytes`, as 64 lower-case hex digits. */
export function sha256Hex(bytes: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ])
  const w = new Uint32Array(64)
  const length = bytes.length
  // INFO: the message plus 0x80, zeros and the 64-bit bit length, rounded
  // up to whole 64-byte blocks; only the last one or two blocks are copied
  const blocks = Math.ceil((length + 9) / 64)
  const tail = new Uint8Array(128)
  const fullBlocks = Math.floor(length / 64)
  const tailFrom = fullBlocks * 64
  tail.set(bytes.subarray(tailFrom))
  tail[length - tailFrom] = 0x80
  const tailBlocks = blocks - fullBlocks
  const bitLength = length * 8
  const end = tailBlocks * 64
  tail[end - 4] = (bitLength >>> 24) & 0xff
  tail[end - 3] = (bitLength >>> 16) & 0xff
  tail[end - 2] = (bitLength >>> 8) & 0xff
  tail[end - 1] = bitLength & 0xff
  // INFO: lengths of 512 MiB and more need the high word; images never are
  tail[end - 5] = Math.floor(length / 0x20000000) & 0xff

  for (let block = 0; block < blocks; block++) {
    const source = block < fullBlocks ? bytes : tail
    const offset = block < fullBlocks ? block * 64 : (block - fullBlocks) * 64
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4
      w[i] =
        (source[j] << 24) |
        (source[j + 1] << 16) |
        (source[j + 2] << 8) |
        source[j + 3]
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]
      const b = w[i - 2]
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }
    let a = h[0]
    let b = h[1]
    let c = h[2]
    let d = h[3]
    let e = h[4]
    let f = h[5]
    let g = h[6]
    let k = h[7]
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (k + S1 + ch + K[i] + w[i]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      k = g
      g = f
      f = e
      e = (d + t1) | 0
      d = c
      c = b
      b = a
      a = (t1 + t2) | 0
    }
    h[0] += a
    h[1] += b
    h[2] += c
    h[3] += d
    h[4] += e
    h[5] += f
    h[6] += g
    h[7] += k
  }
  return Array.from(h, (v) => v.toString(16).padStart(8, '0')).join('')
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}
