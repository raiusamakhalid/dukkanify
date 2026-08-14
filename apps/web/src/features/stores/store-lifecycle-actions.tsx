"use client";

import type { StoreStatus } from "@dukkanify/contracts";
import { Globe, Loader2, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteStore, updateStoreStatus } from "@/features/stores/actions";
import { cn } from "@/lib/utils";

/**
 * Publish, unpublish and delete — the three writes that change a store's life rather than
 * its contents.
 *
 * The behaviour is unchanged from the first version: optimistic nothing, a Server Action per
 * write, a toast for the answer, and `router.refresh()` so the list around it agrees. What
 * changed is that deletion no longer goes through `window.confirm`. A native modal in an
 * otherwise designed product is jarring, it cannot be styled, it names the origin rather
 * than the store, and on some platforms it can be suppressed entirely — which would turn a
 * confirmation into a silent delete.
 */
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
  const [confirming, setConfirming] = useState(false);

  const published = status === "PUBLISHED";
  const nextStatus: StoreStatus = published ? "DRAFT" : "PUBLISHED";

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
    setBusy("delete");
    startTransition(async () => {
      const result = await deleteStore(storeId);
      setBusy(null);
      setConfirming(false);
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
      <button
        type="button"
        disabled={disabled}
        onClick={onStatus}
        className={cn(
          "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          published
            ? "border-input text-foreground hover:bg-secondary border"
            : "bg-emerald text-ivory hover:bg-emerald-deep",
        )}
      >
        {busy === "status" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : published ? (
          <Undo2 className="size-3.5" aria-hidden="true" />
        ) : (
          <Globe className="size-3.5" aria-hidden="true" />
        )}
        {busy === "status"
          ? "Saving…"
          : published
            ? "Unpublish"
            : "Publish Store"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setConfirming(true);
        }}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/8 focus-visible:ring-destructive inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Delete
      </button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{storeName}”?</DialogTitle>
            <DialogDescription>
              The storefront, its theme, its pages and all eight products are
              removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose
              className="border-input hover:bg-secondary rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              disabled={disabled}
            >
              Keep it
            </DialogClose>
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className="bg-destructive focus-visible:ring-destructive inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              {busy === "delete" && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              {busy === "delete" ? "Deleting…" : "Delete store"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
