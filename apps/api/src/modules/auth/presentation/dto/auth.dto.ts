import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type AuthResponse,
  type SignInRequest,
  type SignUpRequest,
  type UserDto,
} from '@dukkanify/contracts';

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

/** RFC 5321's ceiling. Longer than this is a payload, not an address. */
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 80;

export class SignUpDto implements SignUpRequest {
  @ApiProperty({ example: 'abdullah@example.ae', maxLength: MAX_EMAIL_LENGTH })
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email!: string;

  @ApiProperty({
    description: 'Stored only as a salted scrypt hash.',
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password!: string;

  @ApiProperty({ example: 'Abdullah Al Mansoori', maxLength: MAX_NAME_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  name!: string;
}

/**
 * Sign-in does not re-apply the sign-up minimum: refusing a short password here would answer
 * "that is too short to be a password on this system", and the hash is what decides anyway.
 */
export class SignInDto implements SignInRequest {
  @ApiProperty({ example: 'abdullah@example.ae', maxLength: MAX_EMAIL_LENGTH })
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email!: string;

  @ApiProperty({ maxLength: MAX_PASSWORD_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  password!: string;
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
