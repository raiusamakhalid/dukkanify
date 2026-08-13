import { Injectable } from '@nestjs/common';
import type { UserDto } from '@dukkanify/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  GoogleIdentity,
  UserAccountRepositoryPort,
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

/** The fields a sign-in refreshes on every visit. */
function profileFrom(identity: GoogleIdentity): {
  googleId: string;
  name: string | null;
  avatarUrl: string | null;
} {
  return {
    googleId: identity.googleId,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
  };
}
