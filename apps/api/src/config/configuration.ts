import { Global, Module } from '@nestjs/common';
import {
  DEFAULT_AI_MODEL,
  type AiProvider,
  type Env,
  validateEnv,
} from './env.validation';

/**
 * The typed configuration every other provider injects.
 *
 * A class rather than an interface, because Nest needs a runtime token to inject — this is
 * what makes `inject: [AppConfig]` in the port bindings of §4 possible. Nothing outside
 * this file reads `process.env`.
 */
export class AppConfig {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly port: number;
  readonly corsOrigins: readonly string[];
  readonly database: { readonly url: string };
  readonly ai: {
    readonly provider: AiProvider;
    /** Undefined for the mock provider, which needs no credential. */
    readonly apiKey: string | undefined;
    readonly model: string;
    readonly maxTokens: number;
  };
  readonly jwt: { readonly secret: string; readonly expiresInSeconds: number };
  readonly google: { readonly clientId: string };
  readonly throttle: { readonly ttl: number; readonly limit: number };

  constructor(env: Env) {
    this.nodeEnv = env.NODE_ENV;
    this.port = env.PORT;
    this.corsOrigins = env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    this.database = { url: env.DATABASE_URL };
    this.ai = {
      provider: env.AI_PROVIDER,
      apiKey:
        env.AI_PROVIDER === 'claude'
          ? env.ANTHROPIC_API_KEY
          : env.GEMINI_API_KEY,
      model: env.AI_MODEL ?? DEFAULT_AI_MODEL[env.AI_PROVIDER],
      maxTokens: env.AI_MAX_TOKENS,
    };
    this.jwt = {
      secret: env.JWT_SECRET,
      expiresInSeconds: env.JWT_EXPIRES_IN,
    };
    this.google = { clientId: env.GOOGLE_CLIENT_ID };
    this.throttle = { ttl: env.THROTTLE_TTL, limit: env.THROTTLE_LIMIT };
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}

/**
 * Global because configuration is genuinely cross-cutting: the alternative is importing a
 * config module into every feature module, which is ceremony that communicates nothing.
 *
 * The module lives here rather than in a third file so that §4's `config/` folder stays the
 * two files it specifies.
 */
@Global()
@Module({
  providers: [
    {
      provide: AppConfig,
      // Instantiated during bootstrap, so invalid configuration fails `NestFactory.create`
      // with the list from validateEnv — before a port is opened or a query is issued.
      useFactory: (): AppConfig => new AppConfig(validateEnv(process.env)),
    },
  ],
  exports: [AppConfig],
})
export class AppConfigModule {}
