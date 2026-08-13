"use client";

import type { StoreDto, ThemeColors } from "@dukkanify/contracts";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSection } from "./actions";
import {
  useBuilderStore,
  useIsDirty,
  useSectionContent,
} from "./builder-store";
import { type SectionField, fieldsOf, withField } from "./section-fields";

/**
 * The editor (PDF §4.7): the selected section's text on one side, the shop's colours on the
 * other.
 *
 * Text and colour are edited by deliberately different means. Text is state — it has to be
 * saved, validated and rolled back, so it goes through the draft store and a Server Action.
 * Colour is not: a picker writes `--brand-primary` straight onto the canvas element, so
 * dragging it repaints every section in one style write with no React render at all
 * (architecture.md §11). That is also why colours are preview-only for now — the API has no
 * endpoint that persists a theme.
 */

const COLOUR_FIELDS: readonly { key: keyof ThemeColors; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "secondary", label: "Secondary" },
  { key: "muted", label: "Muted" },
];

export function EditorPanel({ store }: { store: StoreDto }) {
  const sections = store.pages.flatMap((page) => page.sections);
  const open = useBuilderStore((state) => state.open);
  const selectedId = useBuilderStore((state) => state.selectedSectionId);
  const panel = useRef<HTMLDivElement>(null);

  // Point the store at this shop. Not a data fetch — it is the one place client state has to
  // be told which server data it is holding drafts for.
  useEffect(() => {
    open(store.id, sections);
  }, [open, store.id, sections]);

  const selected = sections.find((section) => section.id === selectedId);

  // Bring the fields into view when a section is chosen from the canvas, which on a narrow
  // screen is the difference between an editor and a mystery.
  useEffect(() => {
    if (selectedId !== null) {
      panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  return (
    <div
      ref={panel}
      className="border-border/60 bg-card lg:sticky lg:top-6 rounded-xl border p-5"
    >
      <h2 className="text-base font-semibold tracking-tight">Editor</h2>

      {selected === undefined ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Choose a section on the left to edit its words.
        </p>
      ) : (
        <SectionEditor
          key={selected.id}
          storeId={store.id}
          section={selected}
          label={selected.type.toLowerCase().replace(/_/g, " ")}
        />
      )}

      <ColourEditor colors={store.theme.colors} />
    </div>
  );
}

function SectionEditor({
  storeId,
  section,
  label,
}: {
  storeId: string;
  section: StoreDto["pages"][number]["sections"][number];
  label: string;
}) {
  const content = useSectionContent(section);
  const dirty = useIsDirty(section.id);
  const edit = useBuilderStore((state) => state.edit);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const rollback = useBuilderStore((state) => state.rollback);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  /**
   * What the boxes currently show, which is not always what the section currently holds.
   *
   * An edit that the contract refuses — an emptied headline on the way to retyping it —
   * must stay on screen while being rejected, or the field fights the person typing in it.
   * The draft keeps the last *valid* content; this keeps the keystrokes. Cleared whenever
   * the section's content is replaced from elsewhere, so a rollback is visible in the panel
   * and not just on the canvas.
   */
  const [typed, setTyped] = useState<Record<string, string>>({});

  const fields = fieldsOf(content);

  const change = (field: SectionField, raw: string) => {
    setTyped((previous) => ({ ...previous, [field.key]: raw }));

    const result = withField(content, field, raw);
    if (result.ok) {
      setInvalid(null);
      edit(section.id, result.content, content);
      return;
    }
    setInvalid(result.message);
  };

  const save = () => {
    startSaving(async () => {
      const result = await saveSection(storeId, section.id, content);

      if (result.ok) {
        markSaved(section.id);
        setTyped({});
        toast.success("Section saved");
        return;
      }

      // The canvas has been showing this edit since the first keystroke. Putting the previous
      // content back — on the canvas *and* in the boxes — is the half of "optimistic" that
      // most implementations skip.
      rollback(section.id);
      setTyped({});
      setInvalid(null);
      toast.error(result.message);
    });
  };

  return (
    <div className="mt-4">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>

      <div className="mt-4 space-y-4">
        {fields.map((field, index) => (
          <div key={field.key}>
            <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
            {field.kind === "text" ? (
              <Input
                id={`field-${field.key}`}
                value={typed[field.key] ?? field.value}
                autoFocus={index === 0}
                disabled={isSaving}
                onChange={(event) => {
                  change(field, event.target.value);
                }}
                className="mt-1.5"
              />
            ) : (
              <Textarea
                id={`field-${field.key}`}
                value={typed[field.key] ?? field.value}
                rows={field.kind === "lines" ? 5 : 3}
                disabled={isSaving}
                onChange={(event) => {
                  change(field, event.target.value);
                }}
                className="mt-1.5"
              />
            )}
          </div>
        ))}
      </div>

      {invalid !== null && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {invalid}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="button" onClick={save} disabled={!dirty || isSaving}>
          {isSaving ? "Saving…" : "Save section"}
        </Button>
        <span className="text-muted-foreground text-xs">
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
      </div>
    </div>
  );
}

/**
 * The colour pickers.
 *
 * Each one writes a single custom property on the canvas element and nothing else — no state,
 * no re-render, no recompile. Every section paints from `var(--brand-*)`, so a drag repaints
 * the whole shop at the browser's own frame rate.
 */
function ColourEditor({ colors }: { colors: ThemeColors }) {
  const apply = (key: keyof ThemeColors, value: string) => {
    const canvas = document.querySelector<HTMLElement>("[data-builder-canvas]");
    canvas?.style.setProperty(BRAND_PROPERTY[key], value);
  };

  return (
    <div className="border-border/60 mt-6 border-t pt-5">
      <h3 className="text-sm font-medium">Colours</h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Applied to every section as you drag. Not saved yet — the API has no
        theme endpoint.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {COLOUR_FIELDS.map((field) => (
          <li key={field.key} className="flex items-center gap-2">
            <input
              id={`colour-${field.key}`}
              type="color"
              defaultValue={colors[field.key]}
              onChange={(event) => {
                apply(field.key, event.target.value);
              }}
              className="border-input size-8 shrink-0 cursor-pointer rounded-md border bg-transparent"
            />
            <Label htmlFor={`colour-${field.key}`} className="text-xs">
              {field.label}
            </Label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Theme token → custom property. The same pairs `themeToCssVariables` writes; named here
 * because a picker has to address one property, not rebuild the whole style object.
 */
const BRAND_PROPERTY: Record<keyof ThemeColors, string> = {
  primary: "--brand-primary",
  secondary: "--brand-secondary",
  accent: "--brand-accent",
  background: "--brand-bg",
  foreground: "--brand-fg",
  muted: "--brand-muted",
};
