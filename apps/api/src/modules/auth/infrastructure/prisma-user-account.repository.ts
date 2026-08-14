import { Injectable } from '@nestjs/common';
import type { UserDto } from '@dukkanify/contracts';
import { ConflictError } from '../../../common/errors/domain.error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  GoogleIdentity,
  NewPasswordAccount,
  UserAccountRepositoryPort,
  UserCredential,
} from '../application/auth.ports';

/** Exactly the columns `UserDto` declares, so nothing else can leak past this line. */
const USER_DTO_COLUMNS = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PrismaUserAccountRepository implements UserAccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByGoogleIdentity(identity: GoogleIdentity): Promise<UserDto> {
    const existing = await this.findAccount(identity);

    if (existing !== null) {
      // The email is deliberately left alone: it identifies the account here, and a changed
      // Google address must not be able to overwrite its way onto another user's row.
      return this.prisma.user.update({
        where: { id: existing.id },
        data: profileFrom(identity),
        select: USER_DTO_COLUMNS,
      });
    }

    try {
      return await this.prisma.user.create({
        data: { ...profileFrom(identity), email: identity.email },
        select: USER_DTO_COLUMNS,
      });
    } catch (error) {
      // Two first sign-ins at once: the unique indexes on `googleId` and `email` are what
      // guarantee one row per person, so losing that race means the row now exists. Read it
      // back instead of failing a sign-in that in fact succeeded.
      const created = await this.findAccount(identity);
      if (created === null) {
        throw error;
      }
      return created;
    }
  }

  async findCredentialByEmail(email: string): Promise<UserCredential | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: { ...USER_DTO_COLUMNS, passwordHash: true },
    });
    if (row === null) {
      return null;
    }

    const { passwordHash, ...user } = row;
    return { user, passwordHash };
  }

  async createWithPassword(account: NewPasswordAccount): Promise<UserDto> {
    try {
      return await this.prisma.user.create({
        data: {
          email: account.email,
          name: account.name,
          passwordHash: account.passwordHash,
        },
        select: USER_DTO_COLUMNS,
      });
    } catch (error) {
      // The unique index on `email` is the only thing that can arbitrate two sign-ups for one
      // address arriving together. Losing that race gives the same answer the service gives
      // when it sees the row first — never an update, which would put this password on an
      // account the caller has not proven is theirs.
      //
      // Read back rather than matched on a Prisma error code, so that a dropped connection
      // stays the failure it is instead of telling someone their address is taken.
      const existing = await this.prisma.user.findUnique({
        where: { email: account.email },
        select: { id: true },
      });
      if (existing === null) {
        throw error;
      }
      throw new ConflictError(
        'That email is already registered. Sign in instead.',
      );
    }
  }

  /** By `googleId` first — it is stable — then by email, so an existing account is adopted. */
  private async findAccount(identity: GoogleIdentity): Promise<UserDto | null> {
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: identity.googleId },
      select: USER_DTO_COLUMNS,
    });
    if (byGoogleId !== null) {
      return byGoogleId;
    }
    return this.prisma.user.findUnique({
      where: { email: identity.email },
      select: USER_DTO_COLUMNS,
    });
  }
}

/**
 * The fields a sign-in refreshes on every visit.
 *
 * `passwordHash: null` is the load-bearing one. Google has verified this address; a password
 * on the row was set by whoever typed the address first, and no verification email exists
 * here to tell an owner from an impostor. Clearing it means someone who registered
 * `victim@example.com` before the owner ever arrived cannot keep signing in as them
 * afterwards. The cost is real and accepted: a person who signed up with a password and then
 * chooses Google loses that password, and with no reset flow they are Google-only from then
 * on (§14).
 */
function profileFrom(identity: GoogleIdentity): {
  googleId: string;
  name: string | null;
  avatarUrl: string | null;
  passwordHash: null;
} {
  return {
    googleId: identity.googleId,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    passwordHash: null,
  };
}
