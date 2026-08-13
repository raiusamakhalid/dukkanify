"use client";

import { MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH } from "@dukkanify/contracts";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type GenerateState, generateStore } from "./actions";

/**
 * The prompt interface (PDF §4.4) — the only client component on the page.
 *
 * It is a `<form>` first and an interactive component second: the action is a Server Action,
 * so submitting works with no JavaScript at all. What the client adds is the live character
 * count, the example chips, and the pending state, none of which are load-bearing.
 */

/** Written to sound like a person describing their shop, not like a demo of a text box. */
const EXAMPLES = [
  "Create a luxury perfume store for UAE customers",
  "A bukhoor and incense shop in Sharjah, with brass burners",
  "متجر هدايا لرمضان والعيد في دبي",
] as const;

/** Where the counter turns from information into a warning. */
const COUNTER_WARNING_AT = MAX_PROMPT_LENGTH - 50;

export function PromptComposer() {
  const [state, action, isPending] = useActionState<GenerateState, FormData>(
    generateStore,
    { status: "idle" },
  );
  const [prompt, setPrompt] = useState("");

  const tooShort = prompt.trim().length < MIN_PROMPT_LENGTH;

  return (
    <form action={action} className="mt-10">
      <label htmlFor="prompt" className="text-base font-medium">
        What are you selling?
      </label>
      <p className="text-muted-foreground mt-1 text-sm">
        One sentence is enough. Write it in Arabic and the shop is built in
        Arabic.
      </p>

      <Textarea
        id="prompt"
        name="prompt"
        rows={4}
        value={prompt}
        onChange={(event) => {
          setPrompt(event.target.value);
        }}
        maxLength={MAX_PROMPT_LENGTH}
        disabled={isPending}
        placeholder="A perfume house in Sharjah selling aged oud and hand-blended attar"
        aria-describedby="prompt-counter"
        className="mt-4 min-h-32 text-base"
      />

      <div className="mt-2 flex items-start justify-between gap-4">
        <p
          id="prompt-counter"
          aria-live="polite"
          className={cn(
            "text-sm",
            prompt.length >= COUNTER_WARNING_AT
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {prompt.length} / {MAX_PROMPT_LENGTH}
        </p>
      </div>

      <div className="mt-6">
        <p className="text-muted-foreground text-sm">
          Or start from one of these
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => {
                  setPrompt(example);
                }}
                disabled={isPending}
                lang={/[؀-ۿ]/.test(example) ? "ar" : "en"}
                className="border-input hover:bg-secondary focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {state.status === "error" && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive mt-6 rounded-lg border px-4 py-3 text-sm"
        >
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={isPending || tooShort}>
          {isPending ? "Building your shop…" : "Generate my store"}
        </Button>

        {isPending && (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            Writing the copy and pricing the catalogue. This takes a few
            seconds.
          </p>
        )}
      </div>
    </form>
  );
}
