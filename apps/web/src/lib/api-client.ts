import { z } from "zod";

/**
 * The one place this application talks to the API.
 *
 * Three jobs, none of which any caller should repeat: unwrap the `{ data, meta }` envelope
 * every endpoint is wrapped in, validate what came back, and turn a failure into something
 * a component can act on rather than a status code it has to remember the meaning of.
 *
 * Deliberately session-free. `lib/auth.ts` calls this during the token exchange, so it
 * cannot call `auth()` in return — the token arrives as an argument, and `apiAsUser` in
 * `lib/auth.ts` is the session-aware entry point built on top of it.
 */

/** The only public variable the web app has (architecture.md §12). Read exactly once. */
const API_URL = z
  .string()
  .url(
    "NEXT_PUBLIC_API_URL must be an absolute URL, e.g. http://localhost:4000/api/v1",
  )
  .parse(process.env.NEXT_PUBLIC_API_URL);

/** Long enough for a slow database read, short enough that a hung socket is not a spinner
    forever. Generation is the one call that legitimately takes longer and passes its own. */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Mirrors the envelope `TransformInterceptor` writes. */
const EnvelopeSchema = z.object({ data: z.unknown() });

/** Mirrors what `AllExceptionsFilter` writes. Every field but the message is optional,
    because an error body is the last thing that should throw while reporting a failure. */
const ErrorBodySchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

/**
 * What went wrong, in terms the interface can branch on.
 *
 * A union rather than a class hierarchy: every one of these is the same event — a request
 * did not produce data — and the only thing a caller does differently is which sentence it
 * shows and whether it offers a retry. Eight near-empty subclasses would not earn their file.
 */
export type ApiErrorKind =
  | "validation" // 400 — the request was malformed; a form should say which field
  | "unauthorized" // 401 — the session is gone or was never valid; sign in again
  | "forbidden" // 403 — signed in, but this is someone else's store
  | "not-found" // 404
  | "generation-failed" // 422 — the model could not produce a valid storefront
  | "rate-limited" // 429 — too many generations this minute
  | "unavailable" // 503 — the AI provider is down or timed out
  | "network" // never reached the API at all
  | "server"; // 500, or anything unrecognised

const KIND_BY_STATUS: Readonly<Record<number, ApiErrorKind>> = {
  400: "validation",
  401: "unauthorized",
  403: "forbidden",
  404: "not-found",
  422: "generation-failed",
  429: "rate-limited",
  503: "unavailable",
};

/** The sentence shown when the API sent no message of its own, per kind. */
const FALLBACK_MESSAGE: Readonly<Record<ApiErrorKind, string>> = {
  validation:
    "Some of that could not be accepted. Check the highlighted fields.",
  unauthorized: "Your session has expired. Sign in again to continue.",
  forbidden: "This store belongs to another account.",
  "not-found": "We could not find that.",
  "generation-failed":
    "The store generator could not build a storefront from that description. Try rewording it.",
  "rate-limited": "That is a lot of stores at once. Try again in a minute.",
  unavailable:
    "The store generator is unavailable right now. Please try again shortly.",
  network:
    "We could not reach the server. Check your connection and try again.",
  server: "Something went wrong on our side. Please try again.",
};

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    /** 0 when the request never reached the API. */
    readonly status: number,
    message: string,
    /** The API's own error code, kept for logs and for the live-support question
        "what exactly did it say". */
    readonly code?: string,
    /** Correlates this failure with the API's log line. */
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * What this client needs from a schema, and nothing more.
 *
 * Deliberately structural rather than `z.ZodType<T>`. `@dukkanify/contracts` is compiled to
 * CommonJS, so its declarations resolve zod's `.d.cts` types, while this app resolves the
 * ESM `.d.ts` — the same library, two nominally unrelated sets of types, and passing a
 * contracts schema to a `z.ZodType<T>` parameter fails with "two different types with this
 * name exist". Asking only for `safeParse` sidesteps the question entirely: every zod schema
 * from either build satisfies it, and `T` is still inferred from the parsed data.
 */
export interface ResponseSchema<T> {
  safeParse(
    value: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: readonly unknown[] } };
}

export interface ApiRequestOptions<T> {
  /** Required, not optional: an API response is external input, and CLAUDE.md admits no
      unvalidated external input. It is also what makes the return type honest. */
  schema: ResponseSchema<T>;
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** The application JWT from the session. Omitted for public endpoints. */
  token?: string | undefined;
  /** Cache tags, so a Server Action can `revalidateTag` after a write. */
  tags?: readonly string[];
  /** Reads of a user's own data must not be cached; `no-store` is the honest default for
      anything holding a token. */
  cache?: RequestCache;
  timeoutMs?: number;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions<T>,
): Promise<T> {
  const {
    schema,
    method = "GET",
    body,
    token,
    tags,
    cache,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const response = await send(path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(cache === undefined ? {} : { cache }),
    ...(tags === undefined ? {} : { next: { tags: [...tags] } }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const payload: unknown = await readJson(response);

  if (!response.ok) {
    throw errorFrom(response.status, payload);
  }

  const envelope = EnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    throw new ApiError(
      "server",
      response.status,
      "The server replied in a shape this app does not understand.",
    );
  }

  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) {
    // The API and the contract have drifted. Loud, because the alternative is a component
    // rendering `undefined` and someone spending an afternoon on it.
    throw new ApiError(
      "server",
      response.status,
      "The server sent data this app cannot read.",
      "CONTRACT_MISMATCH",
      undefined,
      parsed.error.issues,
    );
  }

  return parsed.data;
}

/** Network faults never surface as `fetch` rejections to a caller — they are `ApiError`s
    like every other failure, so nothing has to handle two kinds of thing. */
async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    throw new ApiError(
      "network",
      0,
      timedOut
        ? "The server took too long to answer. Please try again."
        : FALLBACK_MESSAGE.network,
      undefined,
      undefined,
      cause,
    );
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    // A gateway HTML page, or a 204. Neither is JSON, and neither should crash the caller.
    return undefined;
  }
}

function errorFrom(status: number, payload: unknown): ApiError {
  const kind = KIND_BY_STATUS[status] ?? "server";
  const body = ErrorBodySchema.safeParse(payload);
  const error = body.success ? body.data.error : undefined;

  return new ApiError(
    kind,
    status,
    error?.message ?? FALLBACK_MESSAGE[kind],
    error?.code,
    error?.requestId,
    error?.details,
  );
}
