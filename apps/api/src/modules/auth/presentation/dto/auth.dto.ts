import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { AuthResponse, UserDto } from '@dukkanify/contracts';

/**
 * The HTTP shapes of the auth endpoint.
 *
 * Classes rather than the Zod types from `@dukkanify/contracts` because both jobs here are
 * runtime-decorator jobs: the global `ValidationPipe` reads class-validator metadata, and
 * Swagger reads `@ApiProperty`. They `implement` the contract types, so a change in
 * `packages/contracts` breaks this file at compile time instead of drifting from it.
 *
 * `!` on the fields is the definite-assignment assertion: the pipe constructs these through
 * class-transformer, so there is no constructor for TypeScript to see the assignment in.
 */

/** A Google `id_token` is a JWT, comfortably under 4 KB; the bound just refuses a payload. */
const MAX_ID_TOKEN_LENGTH = 4096;

export class GoogleSignInDto {
  @ApiProperty({
    description:
      'The `id_token` returned by the browser Google OAuth flow. Verified server-side.',
    maxLength: MAX_ID_TOKEN_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_ID_TOKEN_LENGTH)
  idToken!: string;
}

export class AuthUserDto implements UserDto {
  @ApiProperty({ example: 'clx8k2p9a0000v8og3h1k2m4n' })
  id!: string;

  @ApiProperty({ example: 'abdullah@example.ae' })
  email!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Abdullah Al Mansoori',
  })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl!: string | null;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({
    description:
      'Send as `Authorization: Bearer <token>` on every later request.',
  })
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
