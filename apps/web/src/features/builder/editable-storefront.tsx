"use client";

import type { SectionDto, StoreDto } from "@dukkanify/contracts";
import { Pencil } from "lucide-react";
import { SectionRenderer } from "@/features/storefront/section-renderer";
import { StorefrontFrame } from "@/features/storefront/storefront-frame";
import { cn } from "@/lib/utils";
import {
  useBuilderStore,
  useIsDirty,
  useSectionContent,
} from "./builder-store";
import { SECTION_META } from "./section-meta";

/**
 * The shop as the owner sees it while editing: the same frame, the same section components,
 * with selection layered over them.
 *
 * `SectionRenderer` and every section under it are imported here unchanged — they hold no
 * state and touch no server API, so the identical components that server-render the public
 * storefront run inside this client component. That is the "one set of components, two
 * contexts" claim in architecture.md §5, and it is why an edit cannot make the builder and
 * the live shop disagree about how a section looks.
 *
 * The selection chrome is drawn in the *product's* emerald rather than in the shop's own
 * `--brand-primary`, which is a deliberate reversal of the first version. Tooling painted in
 * the storefront's palette is tooling that disappears into the storefront — and on a dark
 * bukhoor theme, an outline in the shop's primary was invisible against its own background.
 */
export function EditableStorefront({ store }: { store: StoreDto }) {
  return (
    <StorefrontFrame store={store} data-builder-canvas="">
      {store.pages.map((page) => (
        <div key={page.id} id={page.slug}>
          {page.sections.map((section) => (
            <SelectableSection
              key={section.id}
              section={section}
              store={store}
            />
          ))}
        </div>
      ))}
    </StorefrontFrame>
  );
}

function SelectableSection({
  section,
  store,
}: {
  section: SectionDto;
  store: StoreDto;
}) {
  const content = useSectionContent(section);
  const dirty = useIsDirty(section.id);
  const selected = useBuilderStore(
    (state) => state.selectedSectionId === section.id,
  );
  const select = useBuilderStore((state) => state.select);

  const meta = SECTION_META[section.type];

  return (
    <div
      className="group/section relative"
      onClick={() => {
        select(section.id);
      }}
    >
      {/* A ring drawn on a sibling rather than on the section itself: a `ring` on the
          content box would be clipped by the section's own overflow, and an inset shadow
          would sit under the storefront's backgrounds. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-sm transition-all duration-200",
          selected
            ? "ring-emerald ring-2 ring-inset"
            : "ring-emerald/0 group-hover/section:ring-emerald/40 ring-2 ring-inset",
        )}
      />

      {/*
        The accessible way in. Clicking the section itself is a convenience for a mouse; this
        button is what a keyboard reaches, and it says which section it selects rather than
        making a screen reader announce an entire hero as one control.
      */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          select(section.id);
        }}
        aria-pressed={selected}
        className={cn(
          "bg-emerald text-ivory focus-visible:ring-emerald/40 absolute end-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-lifted transition-opacity focus-visible:ring-4 focus-visible:outline-none",
          selected
            ? "opacity-100"
            : "opacity-0 group-hover/section:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Pencil className="size-3" aria-hidden="true" />
        Edit {meta.label.toLowerCase()}
        {dirty && (
          <span
            className="bg-gold size-1.5 rounded-full"
            aria-label=", unsaved"
          />
        )}
      </button>

      <SectionRenderer section={{ ...section, content }} store={store} />
    </div>
  );
}
