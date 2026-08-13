import type { Metadata } from "next";
import Link from "next/link";
import { PromptComposer } from "@/features/generation/prompt-composer";

export const metadata: Metadata = { title: "Create a store" };

/**
 * Where "Create Store" leads: a page whose only job is one sentence from the shop owner.
 *
 * A Server Component holding a single client leaf — the composer — which is the whole
 * arrangement architecture.md §5 asks for.
 */
export default function NewStorePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← Your stores
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
        Describe your shop
      </h1>
      <p className="text-muted-foreground mt-3">
        Dukkanify designs the theme, writes the hero, groups the catalogue into
        categories and prices eight products — then saves the whole shop to your
        account.
      </p>

      <PromptComposer />
    </div>
  );
}
