"use client";

import { MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH } from "@dukkanify/contracts";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { GenerationProgress } from "@/components/generation-progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type GenerateState, generateStore } from "./actions";

/**
 * The prompt interface (PDF §4.4) — the only client component on the page.
 *
 * It is a `<form>` first and an interactive component second: the action is a Server Action,
 * so submitting works with no JavaScript at all. What the client adds is the live character
 * count, the example chips, and the generation theatre below — none of which are
 * load-bearing.
 *
 * While the request is in flight the composer is replaced rather than merely disabled. The
 * call takes tens of seconds; a greyed-out form with a spinner on the button asks someone to
 * watch a control that cannot be used, whereas `GenerationProgress` gives them the five
 * things being done on their behalf. The typed prompt lives in this component's state, above
 * the swap, so a refusal brings the form back with the sentence still in it.
 */

/** Written to sound like a person describing their shop, not like a demo of a text box. */
const EXAMPLES = [
  {
    label: "Luxury perfume",
    prompt: "Create a luxury perfume store for UAE customers",
  },
  {
    label: "Bukhoor & incense",
    prompt: "A bukhoor and incense shop in Sharjah, with brass burners",
  },
  {
    label: "Modern abaya",
    prompt: "A modern abaya and kaftan label in Dubai, made to order",
  },
  {
    label: "هدايا رمضان",
    prompt: "متجر هدايا لرمضان والعيد في دبي",
  },
] as const;

/** Where the counter turns from information into a warning. */
const COUNTER_WARNING_AT = MAX_PROMPT_LENGTH - 50;

const ARABIC = /[؀-ۿ]/;

export function PromptComposer() {
  const [state, action, isPending] = useActionState<GenerateState, FormData>(
    generateStore,
    { status: "idle" },
  );
  const [prompt, setPrompt] = useState("");
  const still = useReducedMotion() ?? false;

  const tooShort = prompt.trim().length < MIN_PROMPT_LENGTH;

  return (
    <div className="mt-10">
      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.div
            key="generating"
            initial={still ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <blockquote className="border-line bg-secondary/60 font-heading rounded-2xl border px-5 py-4 text-lg leading-snug">
              “{prompt.trim()}”
            </blockquote>

            <GenerationProgress running className="mt-5" />

            <p className="text-muted-foreground mt-5 text-center text-sm">
              This usually takes under a minute. Leaving this page cancels it.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="composer"
            action={action}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-line bg-card shadow-lifted focus-within:border-emerald/30 focus-within:ring-emerald/10 rounded-2xl border p-1.5 transition-all duration-300 focus-within:ring-4">
              <div className="flex items-center gap-2 px-4 pt-3">
                <Sparkles className="text-gold size-4" aria-hidden="true" />
                <label
                  htmlFor="prompt"
                  className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase"
                >
                  AI Store Builder
                </label>
              </div>

              {/*
                Borderless, because the card around it is the field. Two visible edges — one
                on the card and one on the control inside it — is the look this redesign is
                trying to leave behind.
              */}
              <Textarea
                id="prompt"
                name="prompt"
                rows={4}
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                }}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder="A perfume house in Sharjah selling aged oud and hand-blended attar…"
                aria-describedby="prompt-counter prompt-hint"
                dir="auto"
                className="min-h-36 resize-none border-0 bg-transparent px-4 py-3 text-lg shadow-none focus-visible:ring-0 md:text-lg"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3">
                <p
                  id="prompt-counter"
                  aria-live="polite"
                  className={cn(
                    "text-xs tabular-nums",
                    prompt.length >= COUNTER_WARNING_AT
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {prompt.length} / {MAX_PROMPT_LENGTH}
                </p>

                <button
                  type="submit"
                  disabled={tooShort}
                  className="bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                >
                  Generate My Store
                  <Sparkles
                    className="size-4 transition-transform duration-300 group-hover:rotate-12"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <p id="prompt-hint" className="text-muted-foreground mt-3 text-sm">
              One sentence is enough. Write it in Arabic and the shop is built
              in Arabic, right to left.
            </p>

            {state.status === "error" && (
              <p
                role="alert"
                className="border-destructive/40 bg-destructive/8 text-destructive mt-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                {state.message}
              </p>
            )}

            <div className="mt-10">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                Try an example
              </p>

              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {EXAMPLES.map((example) => {
                  const arabic = ARABIC.test(example.prompt);
                  return (
                    <li key={example.label}>
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(example.prompt);
                        }}
                        className="border-line bg-card hover:border-emerald/30 hover:shadow-soft focus-visible:ring-ring group w-full rounded-xl border p-4 text-start transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="text-emerald flex items-center gap-2 text-xs font-semibold">
                          {example.label}
                          <ArrowRight
                            className="size-3 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 rtl:-scale-x-100"
                            aria-hidden="true"
                          />
                        </span>
                        <span
                          className="text-muted-foreground mt-1.5 block text-sm"
                          lang={arabic ? "ar" : "en"}
                          dir={arabic ? "rtl" : "ltr"}
                        >
                          {example.prompt}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
