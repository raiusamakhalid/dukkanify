import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse } from '@dukkanify/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../application/auth.service';
import { AuthResponseDto, SignInDto, SignUpDto } from './dto/auth.dto';

/**
 * The password door, beside `AuthController`'s Google one.
 *
 * A second controller on the same `auth` path rather than two more routes on the first,
 * because CLAUDE.md caps a controller at 40 lines and the point of that cap is that a
 * controller never grows into a place where work happens. Both classes still do the same
 * three things: validate, call the service, return the DTO.
 *
 * Five attempts a minute, keyed by address — `ScopedThrottlerGuard` falls back to the IP for
 * a public route, which is all an unauthenticated caller offers. It slows a single source
 * down; it does not pretend to stop a distributed one (§14).
 */
const ATTEMPTS_PER_MINUTE = 5;

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@Throttle({ default: { limit: ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
export class PasswordAuthController {
  constructor(private readonly auth: AuthService) {}

  /** 201: unlike the credential exchanges, this one creates a user. */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account from an email and a password' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'That email already has an account.' })
  @ApiTooManyRequestsResponse({
    description: 'More than five attempts a minute.',
  })
  signUp(@Body() body: SignUpDto): Promise<AuthResponse> {
    return this.auth.signUpWithPassword(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange an email and password for an access token',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'One message for every miss: unknown address, wrong password, or an account with no password.',
  })
  @ApiTooManyRequestsResponse({
    description: 'More than five attempts a minute.',
  })
  signIn(@Body() body: SignInDto): Promise<AuthResponse> {
    return this.auth.signInWithPassword(body);
  }
}
