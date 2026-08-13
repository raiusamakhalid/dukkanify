import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthResponse } from '@dukkanify/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../application/auth.service';
import { AuthResponseDto, GoogleSignInDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 200 rather than 201: this exchanges a credential, it does not create a resource. */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a Google id_token for an application access token',
    description:
      'Verifies the token with Google against this API’s client id, then creates or updates the matching user.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'The token was expired, forged, issued to another client, or carries an unverified email.',
  })
  signInWithGoogle(@Body() body: GoogleSignInDto): Promise<AuthResponse> {
    return this.auth.signInWithGoogle(body.idToken);
  }
}
