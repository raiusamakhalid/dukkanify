"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Contact,
  LayoutTemplate,
  MousePointer2,
  Package,
  Palette,
  Type,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BrowserFrame } from "@/components/browser-frame";
import { IMAGERY } from "@/lib/imagery";
import { cn } from "@/lib/utils";
import { AL_NOOR } from "./demo-stores";

/**
 * The builder, playing itself back.
 *
 * It walks a section at a time: the rail's indicator slides, the canvas outlines the block
 * being worked on, and the property panel swaps to that section's real fields — which are
 * the fields `section-fields.ts` actually exposes for a `HERO`, a `PRODUCT_GRID` and a
 * `CONTACT`, with `AL_NOOR`'s own copy in them. A demo showing controls the editor does not
 * have is a demo that sets up a disappointment two clicks later.
 *
 * The canvas here is a purpose-built three-block miniature rather than `StorePreview`,
 * because the outline has to land exactly on a section boundary and the full preview has no
 * boundaries to land on.
 */

const SECTIONS = [
  {
    id: "hero",
    label: "Hero",
    icon: LayoutTemplate,
    fields: [
      { label: "Headline", value: AL_NOOR.hero.headline },
      { label: "Supporting line", value: AL_NOOR.hero.subheadline },
      { label: "Button label", value: AL_NOOR.hero.cta },
    ],
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    fields: [
      { label: "Heading", value: "The Collection" },
      {
        label: "Supporting line",
        value: "Decanted to order in our Sharjah atelier.",
      },
      { label: "Products shown", value: "8" },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: Contact,
    fields: [
      { label: "Heading", value: "Visit the atelier" },
      { label: "Email", value: "hello@alnoor.ae" },
      { label: "Phone", value: "+971 6 555 0142" },
    ],
  },
] as const;

const DWELL_MS = 3800;

export function EditorShowcase() {
  const still = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (still) {
      return;
    }
    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % SECTIONS.length);
    }, DWELL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [index, still]);

  const active = SECTIONS[index] ?? SECTIONS[0];

  return (
    <BrowserFrame url="dukkanify.com/builder/al-noor">
      <div className="grid min-h-[22rem] grid-cols-[3.25rem_minmax(0,1fr)] sm:min-h-[26rem] sm:grid-cols-[8.5rem_minmax(0,1fr)_11rem]">
        <SectionRail activeId={active.id} still={still} />
        <Canvas activeId={active.id} still={still} />
        <PropertyPanel section={active} still={still} />
      </div>
    </BrowserFrame>
  );
}

function SectionRail({
  activeId,
  still,
}: {
  activeId: string;
  still: boolean;
}) {
  return (
    <div className="border-line bg-muted/40 border-e p-2 sm:p-3">
      <p className="text-muted-foreground hidden px-2 pt-1 pb-3 text-[10px] font-semibold tracking-[0.16em] uppercase sm:block">
        Sections
      </p>

      <ul className="space-y-1">
        {SECTIONS.map((section) => (
          <li key={section.id} className="relative">
            {section.id === activeId && (
              <motion.span
                layoutId="rail-indicator"
                className="bg-emerald/10 ring-emerald/20 absolute inset-0 rounded-lg ring-1"
                transition={
                  still
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 32 }
                }
              />
            )}
            <span
              className={cn(
                "relative flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium sm:justify-start sm:px-2.5",
                section.id === activeId
                  ? "text-emerald"
                  : "text-muted-foreground",
              )}
            >
              <section.icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{section.label}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="border-line mt-3 hidden border-t pt-3 sm:block">
        {[
          { icon: Palette, label: "Theme" },
          { icon: Type, label: "Typography" },
        ].map((item) => (
          <span
            key={item.label}
            className="text-muted-foreground flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium"
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The three blocks the outline travels between. */
function Canvas({ activeId, still }: { activeId: string; still: boolean }) {
  const { colors } = AL_NOOR.theme;

  return (
    <div
      className="relative space-y-2 p-3 sm:p-4"
      style={{ background: colors.background }}
    >
      <CanvasBlock id="hero" activeId={activeId} still={still}>
        <div className="grid grid-cols-[1.2fr_1fr] gap-3">
          <div className="p-3 sm:p-4">
            <p
              className="text-[11px] font-semibold sm:text-sm"
              style={{ color: colors.foreground }}
            >
              {AL_NOOR.hero.headline}
            </p>
            <p
              className="mt-1.5 line-clamp-2 text-[9px] sm:text-[10px]"
              style={{ color: colors.muted }}
            >
              {AL_NOOR.hero.subheadline}
            </p>
            <span
              className="mt-2.5 inline-block rounded px-2 py-1 text-[9px] font-medium"
              style={{ background: colors.primary, color: colors.background }}
            >
              {AL_NOOR.hero.cta}
            </span>
          </div>
          <div className="relative min-h-16">
            <Image
              src={IMAGERY.perfumeBottles.src}
              alt=""
              fill
              sizes="160px"
              className="rounded object-cover"
            />
          </div>
        </div>
      </CanvasBlock>

      <CanvasBlock id="products" activeId={activeId} still={still}>
        <div className="p-3 sm:p-4">
          <p
            className="text-[10px] font-semibold sm:text-xs"
            style={{ color: colors.foreground }}
          >
            The Collection
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {AL_NOOR.products.map((product) => (
              <div key={product.name} className="relative aspect-square">
                <Image
                  src={product.image.src}
                  alt=""
                  fill
                  sizes="60px"
                  className="rounded object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </CanvasBlock>

      <CanvasBlock id="contact" activeId={activeId} still={still}>
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <p
            className="text-[10px] font-semibold sm:text-xs"
            style={{ color: colors.foreground }}
          >
            Visit the atelier
          </p>
          <p className="text-[9px]" style={{ color: colors.muted }}>
            hello@alnoor.ae · +971 6 555 0142
          </p>
        </div>
      </CanvasBlock>
    </div>
  );
}

function CanvasBlock({
  id,
  activeId,
  still,
  children,
}: {
  id: string;
  activeId: string;
  still: boolean;
  children: React.ReactNode;
}) {
  const active = id === activeId;

  return (
    <div className="relative rounded-lg bg-white/55">
      {children}

      <AnimatePresence>
        {active && (
          <motion.span
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-emerald pointer-events-none absolute inset-0 rounded-lg border-2"
          >
            {/* The pointer that "made" the selection, parked on the corner of it. */}
            <MousePointer2
              className="text-emerald absolute -end-1.5 -bottom-1.5 size-4 fill-current rtl:-scale-x-100"
              aria-hidden="true"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function PropertyPanel({
  section,
  still,
}: {
  section: (typeof SECTIONS)[number];
  still: boolean;
}) {
  return (
    <div className="border-line bg-card hidden border-s p-3 sm:block">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
        {section.label}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={section.id}
          initial={still ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-3 space-y-3"
        >
          {section.fields.map((field) => (
            <div key={field.label}>
              <p className="text-muted-foreground text-[10px]">{field.label}</p>
              <p className="border-line bg-background text-foreground mt-1 line-clamp-2 rounded-md border px-2 py-1.5 text-[10px]">
                {field.value}
              </p>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="border-line mt-4 border-t pt-3">
        <p className="text-muted-foreground text-[10px]">Colours</p>
        <div className="mt-2 space-y-2">
          {(
            [
              ["Primary", AL_NOOR.theme.colors.primary],
              ["Accent", AL_NOOR.theme.colors.accent],
            ] as const
          ).map(([label, hex]) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="ring-line size-3.5 rounded-full ring-1"
                style={{ background: hex }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground text-[10px]">{label}</span>
              <span className="text-foreground ms-auto font-mono text-[9px]">
                {hex}
              </span>
            </div>
          ))}
        </div>
      </div>

      <span className="bg-emerald text-ivory mt-4 block rounded-lg py-1.5 text-center text-[10px] font-medium">
        Save Changes
      </span>
    </div>
  );
}
