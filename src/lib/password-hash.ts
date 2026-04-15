import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";

const SCRYPT_ALGORITHM = "scrypt";
const SCRYPT_VERSION = "1";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_PARAMS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} satisfies ScryptOptions;

export const PASSWORD_HASH_EMAIL_SALT_MARKER = SCRYPT_ALGORITHM;

export interface PasswordVerificationResult {
  valid: boolean;
  needsRehash: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_PARAMS);

  return [
    SCRYPT_ALGORITHM,
    SCRYPT_VERSION,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  legacySalt?: string | null
): Promise<PasswordVerificationResult> {
  if (isScryptPasswordHash(storedHash)) {
    return {
      valid: await verifyScryptPassword(password, storedHash),
      needsRehash: false,
    };
  }

  if (!legacySalt) {
    return { valid: false, needsRehash: false };
  }

  const valid = timingSafeEqualHex(createLegacyPasswordHash(password, legacySalt), storedHash);
  return { valid, needsRehash: valid };
}

export function isScryptPasswordHash(storedHash: string): boolean {
  return storedHash.startsWith(`${SCRYPT_ALGORITHM}$`);
}

export function createLegacyPasswordHash(password: string, salt: string): string {
  return createHash("sha256")
    .update(salt + password + salt)
    .digest("hex");
}

async function verifyScryptPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parseScryptHash(storedHash);
  if (!parsed) return false;

  const derivedKey = await scryptAsync(password, parsed.salt, parsed.keyLength, parsed.options);
  return timingSafeEqual(derivedKey, parsed.hash);
}

function parseScryptHash(storedHash: string): {
  salt: Buffer;
  hash: Buffer;
  keyLength: number;
  options: ScryptOptions;
} | null {
  const [algorithm, version, nRaw, rRaw, pRaw, saltHex, hashHex] = storedHash.split("$");

  if (algorithm !== SCRYPT_ALGORITHM || version !== SCRYPT_VERSION) return null;
  if (!saltHex || !hashHex || !isHex(saltHex) || !isHex(hashHex)) return null;

  const N = parsePositiveInteger(nRaw);
  const r = parsePositiveInteger(rRaw);
  const p = parsePositiveInteger(pRaw);
  if (!N || !r || !p) return null;

  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  if (salt.length < SCRYPT_SALT_BYTES || hash.length === 0) return null;

  return {
    salt,
    hash,
    keyLength: hash.length,
    options: { N, r, p, maxmem: SCRYPT_PARAMS.maxmem },
  };
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function timingSafeEqualHex(expectedHex: string, actualHex: string): boolean {
  if (!isHex(expectedHex) || !isHex(actualHex) || expectedHex.length !== actualHex.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actualHex, "hex"));
}

function isHex(value: string): boolean {
  return value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(derivedKey);
    });
  });
}
