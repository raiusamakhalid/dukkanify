"use server";

import {
  GenerateRequestSchema,
  type Locale,
  StoreDtoSchema,
} from "@dukkanify/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isApiError } from "@/lib/api-client";
import { apiAsUser } from "@/lib/auth";

/**
 * Prompt in, storefront out — as a Server Action, so the browser never learns the API's
 * address or carries its token. The composer submits a form; there is no client-side fetch,
 * no `useEffect`, and the page works before hydration.
 */

/**
 * Only the async action is exported at runtime. A `"use server"` file may export nothing
 * else — an exported constant fails with `A "use server" file can only export async
 * functions, found object` the first time the action is *called*, which neither the type
 * checker nor `next build` catches. The initial state therefore lives with the component
 * that holds it; a type export is erased and stays here, beside the action that returns it.
 */
export type GenerateState =
  { status: "idle" } | { status: "error"; message: string };

/**
 * Generation is the one call that can legitimately take the better part of a minute: the API
 * gives a hosted model 60 seconds and may spend a repair turn on top. Anything shorter here
 * would abandon a request the server is still paying for.
 */
const GENERATION_TIMEOUT_MS = 90_000;

export async function generateStore(
  _previous: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const prompt = formData.get("prompt");
  const request = GenerateRequestSchema.safeParse({
    prompt,
    locale: localeOf(prompt),
  });

  if (!request.success) {
    return {
      status: "error",
      message:
        request.error.issues[0]?.message ??
        "Describe the shop you want in a sentence.",
    };
  }

  let storeId: string;
  try {
    const store = await apiAsUser("/generate", {
      method: "POST",
      body: request.data,
      schema: StoreDtoSchema,
      timeoutMs: GENERATION_TIMEOUT_MS,
    });
    storeId = store.id;
  } catch (error) {
    // The API writes messages for people — a 422 says the model could not build a shop from
    // this description, a 429 says slow down. Passing those through beats replacing them
    // with something vaguer.
    return {
      status: "error",
      message: isApiError(error)
        ? error.message
        : "The shop could not be built. Please try again.",
    };
  }

  // The dashboard reads the store list uncached, but the client router keeps its own copy of
  // the rendered page: without this, going back to the dashboard shows a list missing the
  // store that was just made.
  revalidatePath("/dashboard");

  // Outside the try: `redirect` works by throwing, and catching it would turn a successful
  // generation into an error message.
  redirect(`/builder/${storeId}`);
}

/**
 * The language of the prompt decides the language of the shop.
 *
 * There is no language switch in the interface, and adding one would be a control that
 * repeats what the writer already told us. Anything in the Arabic block means an Arabic
 * store, which the API stores as `locale: 'ar'` and renders right-to-left.
 */
function localeOf(prompt: FormDataEntryValue | null): Locale {
  return typeof prompt === "string" && /[؀-ۿ]/.test(prompt) ? "ar" : "en";
}
