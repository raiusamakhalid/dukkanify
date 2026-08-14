"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { BrowserFrame } from "@/components/browser-frame";
import { cn } from "@/lib/utils";
import { AL_NOOR, THEME_PRESETS } from "./demo-stores";
import { StorePreview } from "./store-preview";

/**
 * The theme editor, demonstrating itself.
 *
 * One storefront, four complete themes, and the whole preview repaints when the theme
 * changes — including the typeface, the corner radius and the button colour, because every
 * one of those is a `--brand-*` custom property and none of the components underneath know
 * what they are painted in. That is the actual architecture (architecture.md §11), which is
 * why this section can be a demonstration rather than a mock-up of one.
 *
 * It cycles on its own so the page shows the mechanism to someone scrolling past, and stops
 * cycling the moment a preset is clicked — an animation that keeps overriding the choice a
 * person just made is a control that does not work.
 */

const CYCLE_MS = 3600;

export function ThemeShowcase() {
  const still = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (pinned || still) {
      return;
    }
    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % THEME_PRESETS.length);
    }, CYCLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [index, pinned, still]);

  const preset = THEME_PRESETS[index] ?? THEME_PRESETS[0];

  if (preset === undefined) {
    return null;
  }

  const { colors, fonts, radius } = preset.theme;

  return (
    <div>
      {/*
        Presets above the preview rather than in a rail beside it. The rail was the obvious
        arrangement and the wrong one: this whole component sits in one half of a
        two-column feature row, and `StorePreview` breaks on the *viewport* — so a 15rem
        rail left the storefront 20rem wide while every `sm:` rule inside it still thought
        it had a full screen, and the hero headline wrapped onto four lines. Stacking gives
        the preview the entire column and it renders exactly as it does in the hero.
      */}
      <div
        role="radiogroup"
        aria-label="Theme preset"
        className="flex flex-wrap gap-2"
      >
        {THEME_PRESETS.map((option, optionIndex) => (
          <button
            key={option.name}
            type="button"
            role="radio"
            aria-checked={optionIndex === index}
            onClick={() => {
              setIndex(optionIndex);
              setPinned(true);
            }}
            className={cn(
              "focus-visible:ring-ring flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none",
              optionIndex === index
                ? "border-emerald/30 bg-emerald/5 text-foreground"
                : "border-line text-muted-foreground hover:bg-secondary",
            )}
          >
            <span className="flex gap-1" aria-hidden="true">
              {[
                option.theme.colors.primary,
                option.theme.colors.accent,
                option.theme.colors.background,
              ].map((hex) => (
                <span
                  key={hex}
                  className="ring-line size-3.5 rounded-full ring-1"
                  style={{ background: hex }}
                />
              ))}
            </span>
            <span className="text-sm font-medium">{option.name}</span>
          </button>
        ))}
      </div>

      <BrowserFrame url="alnoor.dukkanify.store" className="mt-5">
        <StorePreview store={AL_NOOR} theme={preset.theme} />
      </BrowserFrame>

      <dl className="border-line bg-card shadow-soft mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border p-4 text-xs sm:grid-cols-3">
        {(
          [
            ["Primary", colors.primary],
            ["Accent", colors.accent],
            ["Background", colors.background],
          ] as const
        ).map(([label, hex]) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="ring-line size-4 shrink-0 rounded-full ring-1 transition-colors duration-500"
              style={{ background: hex }}
              aria-hidden="true"
            />
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground ms-auto font-mono text-[11px] tabular-nums">
              {hex}
            </dd>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Radius</dt>
          <dd className="text-foreground ms-auto text-[11px] tabular-nums">
            {radius}
          </dd>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <dt className="text-muted-foreground shrink-0">Typeface</dt>
          <dd className="text-foreground ms-auto truncate text-[11px]">
            {fonts.display} · {fonts.body}
          </dd>
        </div>
      </dl>
    </div>
  );
}
