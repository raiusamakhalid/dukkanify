import { z } from 'zod';

/**
 * The environment contract, validated once at boot.
 *
 * A missing or malformed variable fails startup with a named list. The alternative is an
 * `undefined` surfacing three layers deep at request time, which is the same bug reported
 * as a mystery instead of as a configuration error.
 */

export const NODE_ENVS = ['development', 'test', 'production'] as const;

/**
 * `mock` is the everyday default: it costs nothing and needs no network. The two hosted
 * providers are both listed because the port in §4 exists precisely so the vendor is a
 * configuration choice — see the note on `AI_MODEL` defaults below.
 */
export const AI_PROVIDERS = ['mock', 'claude', 'gemini'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Which key each provider needs, and therefore which one boot must insist on. */
const API_KEY_VARIABLE = {
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const satisfies Record<Exclude<AiProvider, 'mock'>, string>;

/** Applied when `AI_MODEL` is unset, so neither provider inherits the other's model name. */
export const DEFAULT_AI_MODEL = {
  mock: 'mock',
  claude: 'claude-sonnet-5',
  gemini: 'gemini-3.5-flash',
} as const satisfies Record<AiProvider, string>;

/**
 * Token lifetimes are written the way people say them — `30m`, `12h`, `7d` — and stored as
 * seconds, which is the only unit `jsonwebtoken` accepts without ambiguity.
 */
const DURATION_PATTERN = /^(\d+)([smhdw])$/;
const SECONDS_PER_UNIT: Readonly<Record<string, number | undefined>> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
  w: 604_800,
};

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(NODE_ENVS).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    /** Comma-separated: one origin in development, several behind a proxy. */
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

    DATABASE_URL: z
      .string()
      .min(1)
      .refine(
        (value) =>
          value.startsWith('postgresql://') || value.startsWith('postgres://'),
        'must be a PostgreSQL connection string starting with postgresql://',
      ),

    AI_PROVIDER: z.enum(AI_PROVIDERS).default('mock'),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().min(1).optional(),
    AI_MAX_TOKENS: z.coerce.number().int().min(256).max(64_000).default(8000),

    JWT_SECRET: z
      .string()
      .min(
        32,
        'must be at least 32 characters — generate one with `openssl rand -hex 32`',
      ),
    /** Parsed to seconds here so an unreadable value fails boot, not the first sign-in. */
    JWT_EXPIRES_IN: z
      .string()
      .default('7d')
      .transform((value, ctx) => {
        const match = DURATION_PATTERN.exec(value.trim());
        const amount = match?.[1];
        const unitSeconds =
          match?.[2] === undefined ? undefined : SECONDS_PER_UNIT[match[2]];

        if (amount === undefined || unitSeconds === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'must be a duration such as "30m", "12h" or "7d"',
          });
          return z.NEVER;
        }

        const seconds = Number(amount) * unitSeconds;
        if (seconds <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'must be longer than zero',
          });
          return z.NEVER;
        }
        return seconds;
      }),

    GOOGLE_CLIENT_ID: z.string().min(1),

    THROTTLE_TTL: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === 'mock') {
      return;
    }
    const variable = API_KEY_VARIABLE[env.AI_PROVIDER];
    if (env[variable] === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [variable],
        message: `is required when AI_PROVIDER is "${env.AI_PROVIDER}"`,
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/**
 * The one place `process.env` is turned into something typed. Throws rather than returning
 * a result: there is no useful way to continue booting without configuration.
 */
export function validateEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }

  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'} ${issue.message}`)
    .join('\n');

  throw new Error(
    `Invalid environment configuration:\n${problems}\n\n` +
      'Compare apps/api/.env with apps/api/.env.example.',
  );
}
