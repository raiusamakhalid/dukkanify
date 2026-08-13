"use client";

import type { SectionDto, StoreDto } from "@dukkanify/contracts";
import { SectionRenderer } from "@/features/storefront/section-renderer";
import { StorefrontFrame } from "@/features/storefront/storefront-frame";
import { cn } from "@/lib/utils";
import {
  useBuilderStore,
  useIsDirty,
  useSectionContent,
} from "./builder-store";

/**
 * The shop as the owner sees it while editing: the same frame, the same section components,
 * with selection layered over them.
 *
 * `SectionRenderer` and every section under it are imported here unchanged — they hold no
 * state and touch no server API, so the identical components that server-render the public
 * storefront run inside this client component. That is the "one set of components, two
 * contexts" claim in architecture.md §5, and it is why an edit cannot make the builder and
 * the live shop disagree about how a section looks.
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

  return (
    <div
      className={cn(
        "relative transition-shadow",
        selected && "ring-2 ring-inset",
      )}
      style={
        selected
          ? { boxShadow: "inset 0 0 0 2px var(--brand-primary)" }
          : undefined
      }
      onClick={() => {
        select(section.id);
      }}
    >
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
        className="focus-visible:ring-ring absolute end-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-medium opacity-0 transition-opacity focus-visible:ring-2 focus-visible:opacity-100 group-hover/canvas:opacity-100 hover:opacity-100"
        style={{
          background: "var(--brand-primary)",
          color: "var(--brand-bg)",
        }}
      >
        Edit {labelFor(section)}
        {dirty && <span aria-label=", unsaved"> •</span>}
      </button>

      <SectionRenderer section={{ ...section, content }} store={store} />
    </div>
  );
}

/** "Edit hero" reads better than "Edit HERO", and better than a section id. */
function labelFor(section: SectionDto): string {
  return section.type.toLowerCase().replace(/_/g, " ");
}
