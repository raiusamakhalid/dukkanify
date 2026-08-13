"use server";

import {
  type SectionContent,
  SectionContentSchema,
  SectionDtoSchema,
} from "@dukkanify/contracts";
import { revalidatePath } from "next/cache";
import { isApiError } from "@/lib/api-client";
import { apiAsUser } from "@/lib/auth";

/**
 * Saving one section (PDF §4.7).
 *
 * A Server Action rather than a fetch from the editor: the bearer token stays on the server,
 * and the browser never learns the API's address. The client has already painted the change
 * optimistically, so what matters here is the answer — and that a refusal comes back as
 * something the panel can put in a toast rather than an exception nobody catches.
 */

export type SaveSectionResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function saveSection(
  storeId: string,
  sectionId: string,
  content: SectionContent,
): Promise<SaveSectionResult> {
  // The content crossed a network boundary to get here, so it is checked again on arrival
  // rather than trusted because a client component produced it.
  const validated = SectionContentSchema.safeParse(content);
  if (!validated.success) {
    return {
      ok: false,
      message:
        validated.error.issues[0]?.message ??
        "That section could not be saved.",
    };
  }

  try {
    await apiAsUser(
      `/store/${encodeURIComponent(storeId)}/sections/${encodeURIComponent(sectionId)}`,
      {
        method: "PATCH",
        body: { content: validated.data },
        schema: SectionDtoSchema,
      },
    );
  } catch (error) {
    return { ok: false, message: refusalMessage(error) };
  }

  // So the builder and the public storefront both read the new content on their next visit.
  // The canvas is already showing it; this is about everything that is not on screen.
  revalidatePath(`/builder/${storeId}`);
  revalidatePath("/preview", "layout");

  return { ok: true };
}

/**
 * The API's own sentences are written for people and are passed through — except for a
 * missing section, where its message names the id. That is the right answer to an API
 * client and the wrong one to a shop owner, whose actual problem is that the page in front
 * of them is out of date.
 */
function refusalMessage(error: unknown): string {
  if (!isApiError(error)) {
    return "That section could not be saved.";
  }

  return error.kind === "not-found"
    ? "That section no longer exists. Reload the page to see the current shop."
    : error.message;
}
