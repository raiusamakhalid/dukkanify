"use client";

import type { PageDto, SectionDto, StoreDto } from "@dukkanify/contracts";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  useBuilderStore,
  useIsDirty,
  useSectionContent,
} from "./builder-store";
import { SECTION_META, titleOf } from "./section-meta";

/**
 * The left rail: every section of the shop, grouped by the page it lives on.
 *
 * Two things make it worth the column. It is the only view of the store's *structure* — the
 * canvas shows one long scroll and the panel shows one section, so without this nobody can
 * see that a shop is three pages of five sections. And it is where the unsaved marks live:
 * a dot beside a section name is the answer to "what have I changed and not saved", which
 * previously could only be found by clicking through every section in turn.
 *
 * It reads and writes exactly one piece of state — `selectedSectionId` — so choosing a
 * section here and choosing one on the canvas are the same action.
 */
export function SectionRail({
  store,
  className,
  onSelect,
}: {
  store: StoreDto;
  className?: string;
  /** Lets the mobile layout close the rail after a choice. Absent on desktop. */
  onSelect?: () => void;
}) {
  return (
    <nav
      aria-label="Store sections"
      className={cn("flex flex-col overflow-y-auto", className)}
    >
      {store.pages.map((page) => (
        <PageGroup
          key={page.id}
          page={page}
          {...(onSelect === undefined ? {} : { onSelect })}
        />
      ))}
    </nav>
  );
}

function PageGroup({
  page,
  onSelect,
}: {
  page: PageDto;
  onSelect?: () => void;
}) {
  return (
    <div className="px-3 py-3">
      <p className="text-muted-foreground px-2 pb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
        {page.title}
      </p>

      <ul className="space-y-0.5">
        {page.sections.map((section) => (
          <li key={section.id}>
            <SectionButton
              section={section}
              {...(onSelect === undefined ? {} : { onSelect })}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionButton({
  section,
  onSelect,
}: {
  section: SectionDto;
  onSelect?: () => void;
}) {
  const still = useReducedMotion() ?? false;
  // The *draft* content, not the server's — so renaming a hero in the panel renames it here
  // as you type, which is the cheapest possible proof that the two panes are one editor.
  const content = useSectionContent(section);
  const dirty = useIsDirty(section.id);
  const selected = useBuilderStore(
    (state) => state.selectedSectionId === section.id,
  );
  const select = useBuilderStore((state) => state.select);

  const meta = SECTION_META[section.type];

  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={() => {
        select(section.id);
        onSelect?.();
      }}
      className={cn(
        "focus-visible:ring-ring relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "text-emerald" : "text-foreground/70 hover:bg-secondary/70",
      )}
    >
      {selected && (
        <motion.span
          layoutId="builder-rail-active"
          className="bg-emerald/8 ring-emerald/20 absolute inset-0 rounded-lg ring-1"
          transition={
            still
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 34 }
          }
        />
      )}

      <meta.icon className="relative size-4 shrink-0" aria-hidden="true" />

      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {titleOf(content)}
        </span>
        <span className="text-muted-foreground block text-[10px]">
          {meta.label}
        </span>
      </span>

      {dirty && (
        <span
          className="bg-gold relative size-1.5 shrink-0 rounded-full"
          aria-label="Unsaved changes"
        />
      )}
    </button>
  );
}
