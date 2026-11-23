import { createHash } from 'crypto'
import { sha256Hex } from './sha256'

describe('sha256Hex', () => {
  it.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ])('matches the known digest of %j', (text, digest) => {
    expect(sha256Hex(Uint8Array.from(Buffer.from(text)))).toBe(digest)
  })

  // INFO: every length around the 64-byte block and the 56-byte padding
  // boundary, against Node's own implementation
  it('matches node:crypto for lengths 0..200 and a large buffer', () => {
    for (let n = 0; n <= 200; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 31 + n) & 255)
      expect(sha256Hex(bytes)).toBe(
        createHash('sha256').update(bytes).digest('hex'),
      )
    }
    const big = Uint8Array.from({ length: 300001 }, (_, i) => (i * 7) & 255)
    expect(sha256Hex(big)).toBe(createHash('sha256').update(big).digest('hex'))
  })
})
