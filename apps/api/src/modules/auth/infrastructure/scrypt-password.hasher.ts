import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { PasswordHasherPort } from '../application/auth.ports';

/**
 * scrypt from Node's standard library, with its parameters carried inside the hash.
 *
 * The standard library rather than bcrypt or argon2 because this repository adds no
 * dependency it was not asked for, and scrypt is a memory-hard KDF in the same family of
 * acceptable answers — not a compromise made to avoid an install. What a library would have
 * given for free is the encoding, which is why the format below is written down.
 *
 * ## The format
 *
 * `scrypt$N$r$p$salt$key`, both binary fields base64. Self-describing on purpose: `verify`
 * derives with the parameters **the stored hash names**, not with today's constants, so the
 * cost can be raised whenever hardware makes it cheap without invalidating a single existing
 * password. Nothing rehashes on sign-in yet — that is a deliberate gap, noted in §14.
 */

/** N=2^15, r=8, p=1: ~32 MiB and ~100ms of work per attempt, an OWASP-accepted floor. */
const COST = { N: 32768, r: 8, p: 1 } as const;

/**
 * scrypt needs about `128 * N * r` bytes — at these parameters exactly 33,554,432, which is
 * precisely Node's *default* `maxmem` of 32 MiB, and the check refuses it rather than
 * allowing the boundary. Verified against Node v22: omit this and every sign-up and every
 * sign-in throws `Invalid scrypt params: memory limit exceeded`, which is not a
 * `DomainError`, which makes it a 500 reading "An unexpected error occurred."
 *
 * It doubles as the ceiling `verify` will honour, so a corrupted row cannot ask this process
 * to allocate a gigabyte.
 */
const MAX_MEMORY_BYTES = 64 * 1024 * 1024;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const ALGORITHM = 'scrypt';
const SEPARATOR = '$';
const FIELD_COUNT = 6;

/** Fixed, because the point is to spend the time, not to protect anything. */
const DUMMY_SALT = Buffer.alloc(SALT_LENGTH, 0x2a);

interface ScryptParameters {
  readonly N: number;
  readonly r: number;
  readonly p: number;
}

@Injectable()
export class ScryptPasswordHasher implements PasswordHasherPort {
  private readonly logger = new Logger(ScryptPasswordHasher.name);

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(password, salt, COST);

    return [
      ALGORITHM,
      String(COST.N),
      String(COST.r),
      String(COST.p),
      salt.toString('base64'),
      key.toString('base64'),
    ].join(SEPARATOR);
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const parsed = this.parse(encoded);
    if (parsed === null) {
      return false;
    }

    const derived = await deriveKey(password, parsed.salt, parsed.cost);

    // Length is checked first because `timingSafeEqual` throws on a mismatch rather than
    // answering false — and a differing length is public knowledge anyway.
    return (
      derived.length === parsed.key.length &&
      timingSafeEqual(derived, parsed.key)
    );
  }

  async spendVerificationTime(password: string): Promise<void> {
    await deriveKey(password, DUMMY_SALT, COST);
  }

  private parse(
    encoded: string,
  ): { cost: ScryptParameters; salt: Buffer; key: Buffer } | null {
    const fields = encoded.split(SEPARATOR);
    if (fields.length !== FIELD_COUNT || fields[0] !== ALGORITHM) {
      return this.malformed('unrecognised format');
    }

    const [, n, r, p, salt, key] = fields;
    const cost = {
      N: positiveInteger(n),
      r: positiveInteger(r),
      p: positiveInteger(p),
    };
    if (cost.N === null || cost.r === null || cost.p === null) {
      return this.malformed('non-numeric parameters');
    }
    if (memoryFor({ N: cost.N, r: cost.r, p: cost.p }) > MAX_MEMORY_BYTES) {
      // Either the row is corrupt or it was written by a future version with a cost this
      // build will not spend. Both are "cannot verify", and neither is worth an allocation.
      return this.malformed('parameters exceed the memory ceiling');
    }

    return {
      cost: { N: cost.N, r: cost.r, p: cost.p },
      salt: Buffer.from(salt ?? '', 'base64'),
      key: Buffer.from(key ?? '', 'base64'),
    };
  }

  /** Logged, never thrown, and never told to the caller: they get one generic refusal. */
  private malformed(reason: string): null {
    this.logger.warn(`Stored password hash could not be read: ${reason}`);
    return null;
  }
}

/**
 * Promise-wrapped by hand rather than with `promisify`, whose overload resolution drops the
 * options argument — and recovering it would need the cast CLAUDE.md rules out.
 */
function deriveKey(
  password: string,
  salt: Buffer,
  cost: ScryptParameters,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { ...cost, maxmem: MAX_MEMORY_BYTES },
      (error, key) => {
        if (error !== null) {
          reject(error);
          return;
        }
        resolve(key);
      },
    );
  });
}

function memoryFor(cost: ScryptParameters): number {
  return 128 * cost.N * cost.r;
}

function positiveInteger(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}
