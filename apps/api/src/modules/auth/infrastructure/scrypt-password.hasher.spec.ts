import { randomBytes, scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './scrypt-password.hasher';

/**
 * Real key derivation, no stubs: the parameters are the thing being tested, and a fake
 * scrypt would only prove the encoding round-trips. Each case costs ~100ms, which is what a
 * password hash is supposed to cost.
 */

const hasher = new ScryptPasswordHasher();
const PASSWORD = 'a-perfectly-ordinary-passphrase';

describe('ScryptPasswordHasher', () => {
  it('accepts the password it hashed', async () => {
    const encoded = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, encoded)).resolves.toBe(true);
  });

  it('refuses a password that differs by one character', async () => {
    const encoded = await hasher.hash(PASSWORD);

    await expect(hasher.verify(`${PASSWORD}!`, encoded)).resolves.toBe(false);
  });

  /** The default `maxmem` rejects N=2^15 with r=8; the adapter has to raise it or nothing
      can ever be hashed. This is the case that fails if that argument is dropped. */
  it('hashes at the intended cost rather than throwing on the memory ceiling', async () => {
    const encoded = await hasher.hash(PASSWORD);

    expect(encoded.startsWith('scrypt$32768$8$1$')).toBe(true);
  });

  it('salts, so the same password twice is not the same hash', async () => {
    const [first, second] = await Promise.all([
      hasher.hash(PASSWORD),
      hasher.hash(PASSWORD),
    ]);

    expect(first).not.toBe(second);
  });

  /** Forward compatibility: a hash written at a lower cost must keep verifying after the
      constants are raised, or raising them would lock every existing user out. */
  it('derives with the parameters the stored hash names', async () => {
    const salt = randomBytes(16);
    const key = scryptSync(PASSWORD, salt, 64, { N: 1024, r: 8, p: 1 });
    const encoded = `scrypt$1024$8$1$${salt.toString('base64')}$${key.toString('base64')}`;

    await expect(hasher.verify(PASSWORD, encoded)).resolves.toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['a bcrypt hash from somewhere else', '$2b$10$abcdefghijklmnopqrstuv'],
    ['a truncated field list', 'scrypt$32768$8$1$c2FsdA=='],
    ['non-numeric parameters', 'scrypt$many$8$1$c2FsdA==$a2V5'],
    ['a cost this build will not spend', 'scrypt$1048576$8$1$c2FsdA==$a2V5'],
  ])('refuses %s without throwing', async (_case, encoded) => {
    await expect(hasher.verify(PASSWORD, encoded)).resolves.toBe(false);
  });

  it('spends time on a password with nothing to compare it to', async () => {
    await expect(
      hasher.spendVerificationTime(PASSWORD),
    ).resolves.toBeUndefined();
  });
});
