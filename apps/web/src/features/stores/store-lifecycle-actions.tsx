"use client";

import type { StoreStatus } from "@dukkanify/contracts";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteStore, updateStoreStatus } from "@/features/stores/actions";
import { cn } from "@/lib/utils";

export function StoreLifecycleActions({
  storeId,
  status,
  storeName,
  className,
}: {
  storeId: string;
  status: StoreStatus;
  storeName: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);

  const nextStatus: StoreStatus =
    status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  function onStatus() {
    setBusy("status");
    startTransition(async () => {
      const result = await updateStoreStatus(storeId, nextStatus);
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        nextStatus === "PUBLISHED"
          ? "Store published. Anyone with the link can view it."
          : "Store returned to draft. The public link is hidden.",
      );
      router.refresh();
    });
  }

  function onDelete() {
    const confirmed = window.confirm(
      `Delete “${storeName}”? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setBusy("delete");
    startTransition(async () => {
      const result = await deleteStore(storeId);
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Store deleted.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  const disabled = pending || busy !== null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant={status === "PUBLISHED" ? "outline" : "default"}
        className={status === "PUBLISHED" ? "border-input" : undefined}
        disabled={disabled}
        onClick={onStatus}
      >
        {busy === "status"
          ? "Saving…"
          : status === "PUBLISHED"
            ? "Unpublish"
            : "Publish"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={disabled}
        onClick={onDelete}
      >
        {busy === "delete" ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
