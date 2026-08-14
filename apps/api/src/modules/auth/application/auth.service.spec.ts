import { JwtService } from '@nestjs/jwt';
import type { UserDto } from '@dukkanify/contracts';
import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  UnauthorizedError,
} from '../../../common/errors/domain.error';
import { AuthService } from './auth.service';
import type {
  GoogleTokenVerifierPort,
  NewPasswordAccount,
  PasswordHasherPort,
  UserAccountRepositoryPort,
  UserCredential,
} from './auth.ports';

/**
 * The password paths, with object-literal stubs for all three ports — no scrypt, no Google,
 * no database. What is under test is the decision-making: which failures are told apart,
 * which are deliberately not, and what work is spent on a miss.
 */

const USER: UserDto = {
  id: 'clx8k2p9a0000v8og3h1k2m4n',
  email: 'abdullah@example.ae',
  name: 'Abdullah Al Mansoori',
  avatarUrl: null,
};

const REFUSAL = 'Email or password is incorrect.';

/** Records what the service asked of the hasher, which is the only way to see the
    time-spending on an unknown address from the outside. */
interface HasherCalls {
  readonly hashed: string[];
  readonly verified: Array<{ password: string; encoded: string }>;
  readonly spent: string[];
}

function hasherStub(matches: boolean): {
  hasher: PasswordHasherPort;
  calls: HasherCalls;
} {
  const calls: HasherCalls = { hashed: [], verified: [], spent: [] };

  return {
    calls,
    hasher: {
      hash: (password) => {
        calls.hashed.push(password);
        return Promise.resolve(`hash-of-${password}`);
      },
      verify: (password, encoded) => {
        calls.verified.push({ password, encoded });
        return Promise.resolve(matches);
      },
      spendVerificationTime: (password) => {
        calls.spent.push(password);
        return Promise.resolve();
      },
    },
  };
}

function repositoryStub(
  credential: UserCredential | null,
  created: NewPasswordAccount[] = [],
): UserAccountRepositoryPort {
  return {
    upsertByGoogleIdentity: () => Promise.resolve(USER),
    findCredentialByEmail: () => Promise.resolve(credential),
    createWithPassword: (account) => {
      created.push(account);
      return Promise.resolve(USER);
    },
  };
}

const googleStub: GoogleTokenVerifierPort = {
  verify: () =>
    Promise.reject(new Error('the password paths must not call Google')),
};

function serviceWith(
  users: UserAccountRepositoryPort,
  passwords: PasswordHasherPort,
): AuthService {
  return new AuthService(
    googleStub,
    users,
    passwords,
    new JwtService({ secret: 'test-secret-that-is-long-enough-32chars' }),
  );
}

describe('AuthService — sign up', () => {
  it('hashes the password and returns a token for a new address', async () => {
    const created: NewPasswordAccount[] = [];
    const { hasher, calls } = hasherStub(true);
    const service = serviceWith(repositoryStub(null, created), hasher);

    const result = await service.signUpWithPassword({
      email: 'abdullah@example.ae',
      password: 'a-good-passphrase',
      name: 'Abdullah Al Mansoori',
    });

    expect(result.user).toEqual(USER);
    expect(result.accessToken.length).toBeGreaterThan(0);
    expect(calls.hashed).toEqual(['a-good-passphrase']);
    expect(created[0]?.passwordHash).toBe('hash-of-a-good-passphrase');
  });

  it('lowercases the address, so one person cannot become two accounts', async () => {
    const created: NewPasswordAccount[] = [];
    const { hasher } = hasherStub(true);
    const service = serviceWith(repositoryStub(null, created), hasher);

    await service.signUpWithPassword({
      email: '  Abdullah@Example.AE ',
      password: 'a-good-passphrase',
      name: 'Abdullah Al Mansoori',
    });

    expect(created[0]?.email).toBe('abdullah@example.ae');
  });

  /** A 409, never an update: writing a password onto an existing row would let anyone who
      knows an address take the account. */
  it('refuses an address that already has an account without hashing anything', async () => {
    const { hasher, calls } = hasherStub(true);
    const service = serviceWith(
      repositoryStub({ user: USER, passwordHash: null }),
      hasher,
    );

    await expect(
      service.signUpWithPassword({
        email: 'abdullah@example.ae',
        password: 'a-good-passphrase',
        name: 'Someone Else',
      }),
    ).rejects.toThrow(ConflictError);
    expect(calls.hashed).toEqual([]);
  });
});

describe('AuthService — sign in', () => {
  it('returns a token when the password matches', async () => {
    const { hasher, calls } = hasherStub(true);
    const service = serviceWith(
      repositoryStub({ user: USER, passwordHash: 'stored-hash' }),
      hasher,
    );

    const result = await service.signInWithPassword({
      email: 'abdullah@example.ae',
      password: 'a-good-passphrase',
    });

    expect(result.user).toEqual(USER);
    expect(calls.verified).toEqual([
      { password: 'a-good-passphrase', encoded: 'stored-hash' },
    ]);
  });

  it('refuses a wrong password with the one generic sentence', async () => {
    const { hasher } = hasherStub(false);
    const service = serviceWith(
      repositoryStub({ user: USER, passwordHash: 'stored-hash' }),
      hasher,
    );

    await expect(
      service.signInWithPassword({
        email: 'abdullah@example.ae',
        password: 'wrong',
      }),
    ).rejects.toThrow(REFUSAL);
  });

  /** The oracle this closes: without the dummy derivation an unknown address is refused in a
      millisecond and a known one in a hundred, which is enumeration by stopwatch. */
  it('spends verification time on an address nobody has registered', async () => {
    const { hasher, calls } = hasherStub(true);
    const service = serviceWith(repositoryStub(null), hasher);

    await expect(
      service.signInWithPassword({
        email: 'nobody@example.ae',
        password: 'a-good-passphrase',
      }),
    ).rejects.toThrow(UnauthorizedError);
    expect(calls.spent).toEqual(['a-good-passphrase']);
    expect(calls.verified).toEqual([]);
  });

  /** A Google-only account, or one whose password a Google sign-in cleared. Same sentence:
      saying "this account uses Google" would confirm the address exists. */
  it('refuses an account with no password in the same words', async () => {
    const { hasher, calls } = hasherStub(true);
    const service = serviceWith(
      repositoryStub({ user: USER, passwordHash: null }),
      hasher,
    );

    await expect(
      service.signInWithPassword({
        email: 'abdullah@example.ae',
        password: 'a-good-passphrase',
      }),
    ).rejects.toThrow(REFUSAL);
    expect(calls.spent).toEqual(['a-good-passphrase']);
  });
});
