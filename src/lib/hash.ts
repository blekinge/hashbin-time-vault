export type HashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";

export interface FileHashes {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a file with all supported algorithms (MD5 via SparkMD5, others via SubtleCrypto).
 * MD5 is not available in SubtleCrypto so we use a pure-JS implementation.
 */
export async function hashFileAll(file: File): Promise<FileHashes> {
  const buffer = await file.arrayBuffer();

  const [sha1, sha256, sha512] = await Promise.all([
    crypto.subtle.digest("SHA-1", buffer).then(toHex),
    crypto.subtle.digest("SHA-256", buffer).then(toHex),
    crypto.subtle.digest("SHA-512", buffer).then(toHex),
  ]);

  const md5 = md5Hash(new Uint8Array(buffer));

  return { md5, sha1, sha256, sha512 };
}

/** Legacy single-algorithm hash (SHA-256 only) */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return toHex(await crypto.subtle.digest("SHA-256", buffer));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ── Minimal MD5 implementation (RFC 1321) ──────────────────────────
// Pure JS, no dependencies. Operates on Uint8Array input.

function md5Hash(input: Uint8Array): string {
  const bytes = md5Pad(input);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let i = 0; i < bytes.length; i += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(i + j * 4, true);
    }

    let A = a0, B = b0, C = c0, D = d0;

    for (let j = 0; j < 64; j++) {
      let F: number, g: number;
      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      } else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }
      F = (F + A + MD5_K[j] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << MD5_S[j]) | (F >>> (32 - MD5_S[j])))) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  return md5ToHex(a0) + md5ToHex(b0) + md5ToHex(c0) + md5ToHex(d0);
}

function md5Pad(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;
  const padLen = (((input.length + 8) >>> 6) + 1) * 64;
  const padded = new Uint8Array(padLen);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, bitLen >>> 0, true);
  view.setUint32(padLen - 4, Math.floor(bitLen / 0x100000000), true);
  return padded;
}

function md5ToHex(n: number): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ((n >> (i * 8)) & 0xff).toString(16).padStart(2, "0");
  }
  return s;
}

const MD5_S = [
  7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
  5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
  4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
  6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21,
];

const MD5_K = [
  0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
  0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
  0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
  0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
  0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
  0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
  0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
  0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
];
