import type { SectionContent, SectionDto } from "@dukkanify/contracts";
import { create } from "zustand";

/**
 * What the builder holds that the server does not yet know.
 *
 * One draft per edited section, each remembering the content it started from. That second
 * copy is the whole point: an optimistic update is only honest if it can be taken back, and
 * a rejected `PATCH` has to leave the canvas showing what the database actually contains.
 *
 * Colour edits are deliberately absent. The pickers write `--brand-*` straight to the canvas
 * element, so they cost one style property per change instead of a re-render of every section
 * — see `editor-panel.tsx`.
 */

interface Draft {
  /** What the canvas should render right now. */
  readonly content: SectionContent;
  /** What the database held before this draft existed, kept for rollback. */
  readonly original: SectionContent;
  /** Unsaved. Cleared on a successful save, restored to `original` on a failed one. */
  readonly dirty: boolean;
}

interface BuilderState {
  /** Which store these drafts belong to, so another store's edits can never bleed in. */
  storeId: string | null;
  selectedSectionId: string | null;
  drafts: Readonly<Record<string, Draft>>;

  /** Point the builder at a store, discarding anything held for a different one. */
  open: (storeId: string, sections: readonly SectionDto[]) => void;
  select: (sectionId: string | null) => void;
  /**
   * Record an edit. `previous` is the content being edited *from* — the first edit of a
   * section keeps it as the rollback point. The caller has to supply it because the store
   * holds only what has changed; the server's copy lives in the page's props, not here.
   */
  edit: (
    sectionId: string,
    content: SectionContent,
    previous: SectionContent,
  ) => void;
  /** The server accepted it: keep showing this content, stop calling it unsaved. */
  markSaved: (sectionId: string) => void;
  /** The server refused it: put back what the database has. */
  rollback: (sectionId: string) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  storeId: null,
  selectedSectionId: null,
  drafts: {},

  open: (storeId, sections) => {
    set((state) => {
      if (state.storeId === storeId) {
        // Re-rendered with the same store — a save revalidated the page, say. Keeping the
        // drafts is what stops a pending edit from vanishing under the person making it.
        return state;
      }
      return {
        storeId,
        selectedSectionId: sections[0]?.id ?? null,
        drafts: {},
      };
    });
  },

  select: (sectionId) => {
    set({ selectedSectionId: sectionId });
  },

  edit: (sectionId, content, previous) => {
    set((state) => {
      const existing = state.drafts[sectionId];
      return {
        drafts: {
          ...state.drafts,
          [sectionId]: {
            content,
            // `previous`, never `content`: keeping the new value as the rollback point is
            // how an editor "restores" a section to the first character that was typed.
            original: existing?.original ?? previous,
            dirty: true,
          },
        },
      };
    });
  },

  markSaved: (sectionId) => {
    set((state) => {
      const draft = state.drafts[sectionId];
      if (draft === undefined) {
        return state;
      }
      return {
        drafts: {
          ...state.drafts,
          // The saved content becomes the new rollback point: a later edit that fails should
          // return here, not to what the section said when the page first loaded.
          [sectionId]: {
            content: draft.content,
            original: draft.content,
            dirty: false,
          },
        },
      };
    });
  },

  rollback: (sectionId) => {
    set((state) => {
      const draft = state.drafts[sectionId];
      if (draft === undefined) {
        return state;
      }
      return {
        drafts: {
          ...state.drafts,
          [sectionId]: {
            content: draft.original,
            original: draft.original,
            dirty: false,
          },
        },
      };
    });
  },
}));

/**
 * What a section should render: its draft if it has one, otherwise what the server sent.
 *
 * Called from the canvas for every section, so it takes the server content as a fallback
 * rather than looking it up — the client never needs a second copy of the store.
 */
export function useSectionContent(section: SectionDto): SectionContent {
  return useBuilderStore(
    (state) => state.drafts[section.id]?.content ?? section.content,
  );
}

export function useIsDirty(sectionId: string): boolean {
  return useBuilderStore((state) => state.drafts[sectionId]?.dirty ?? false);
}

/** How many sections are waiting to be saved — the header's "unsaved changes" count. */
export function useDirtyCount(): number {
  return useBuilderStore(
    (state) =>
      Object.values(state.drafts).filter((draft) => draft.dirty).length,
  );
}
