"use server";

import {
  type StoreStatus,
  StoreDtoSchema,
  StoreSummaryDtoSchema,
  UpdateStoreStatusRequestSchema,
} from "@dukkanify/contracts";
import { revalidatePath } from "next/cache";
import { isApiError } from "@/lib/api-client";
import { apiAsUser } from "@/lib/auth";

export type StoreActionResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function updateStoreStatus(
  storeId: string,
  status: StoreStatus,
): Promise<StoreActionResult> {
  const request = UpdateStoreStatusRequestSchema.safeParse({ status });
  if (!request.success) {
    return { ok: false, message: "That status could not be applied." };
  }

  try {
    const store = await apiAsUser(
      `/store/${encodeURIComponent(storeId)}/status`,
      {
        method: "PATCH",
        body: request.data,
        schema: StoreDtoSchema,
      },
    );
    revalidatePath("/dashboard");
    revalidatePath(`/builder/${storeId}`);
    revalidatePath(`/preview/${store.slug}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: lifecycleMessage(error, "update") };
  }
}

export async function deleteStore(storeId: string): Promise<StoreActionResult> {
  try {
    await apiAsUser(`/store/${encodeURIComponent(storeId)}`, {
      method: "DELETE",
      schema: StoreSummaryDtoSchema,
    });
  } catch (error) {
    return { ok: false, message: lifecycleMessage(error, "delete") };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

function lifecycleMessage(error: unknown, action: "update" | "delete"): string {
  if (!isApiError(error)) {
    return action === "delete"
      ? "That store could not be deleted."
      : "That store could not be updated.";
  }

  if (error.kind === "not-found") {
    return "That store no longer exists. Reload the page.";
  }

  return error.message;
}
