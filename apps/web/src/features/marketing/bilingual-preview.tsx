"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { BrowserFrame } from "@/components/browser-frame";
import { cn } from "@/lib/utils";
import { AL_NOOR, AL_NOOR_AR } from "./demo-stores";
import { StorePreview } from "./store-preview";

/**
 * The same shop, in both languages, with the switch that proves there is no switch.
 *
 * The point of the control is slightly perverse and worth stating: the product has no
 * language toggle. An Arabic sentence produces an Arabic shop and an English one produces an
 * English shop, decided once at generation (`localeOf` in the generate action). This toggle
 * exists on the marketing page only, to put the two results next to each other — and what it
 * swaps is the whole storefront, mirrored, retypeset and rewritten, not a string table.
 */
export function BilingualPreview() {
  const still = useReducedMotion() ?? false;
  const [arabic, setArabic] = useState(false);
  const store = arabic ? AL_NOOR_AR : AL_NOOR;

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Storefront language"
        className="border-line bg-card shadow-soft mx-auto flex w-fit gap-1 rounded-full border p-1"
      >
        {[
          { label: "English", value: false, lang: "en" },
          { label: "العربية", value: true, lang: "ar" },
        ].map((option) => (
          <button
            key={option.lang}
            type="button"
            role="radio"
            aria-checked={arabic === option.value}
            lang={option.lang}
            onClick={() => {
              setArabic(option.value);
            }}
            className={cn(
              "focus-visible:ring-ring relative rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              arabic === option.value
                ? "text-ivory"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {arabic === option.value && (
              <motion.span
                layoutId="language-pill"
                className="bg-emerald absolute inset-0 rounded-full"
                transition={
                  still
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <BrowserFrame
          url={arabic ? "alnoor.dukkanify.store/ar" : "alnoor.dukkanify.store"}
        >
          {/* `mode="wait"` so the two never overlap mid-crossfade: an LTR and an RTL copy of
              the same shop stacked on each other for 200ms is unreadable, not a transition. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={store.id}
              initial={still ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <StorePreview store={store} />
            </motion.div>
          </AnimatePresence>
        </BrowserFrame>
      </div>

      <p className="text-muted-foreground mt-5 text-center text-sm">
        {arabic
          ? "Generated from “متجر عطور فاخرة لعملاء الإمارات” — right-to-left, set in Noto Kufi Arabic."
          : "Generated from “Create a luxury perfume store for UAE customers” — left-to-right, set in Source Serif."}
      </p>
    </div>
  );
}
