"use client";

import type { SectionDto, StoreDto, ThemeColors } from "@dukkanify/contracts";
import { AlertCircle, Check, Loader2, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { saveSection } from "./actions";
import {
  useBuilderStore,
  useIsDirty,
  useSectionContent,
} from "./builder-store";
import { SECTION_META } from "./section-meta";
import { type SectionField, fieldsOf, withField } from "./section-fields";
import {
  THEME_PRESETS,
  applyBrandColour,
  applyBrandTheme,
} from "./theme-presets";

/**
 * The editor (PDF §4.7): the selected section's text at the top, the shop's colours below.
 *
 * Text and colour are edited by deliberately different means. Text is state — it has to be
 * saved, validated and rolled back, so it goes through the draft store and a Server Action.
 * Colour is not: a picker writes `--brand-primary` straight onto the canvas element, so
 * dragging it repaints every section in one style write with no React render at all
 * (architecture.md §11). That is also why colours are preview-only for now — the API has no
 * endpoint that persists a theme, and the panel says so rather than implying otherwise.
 */

const COLOUR_FIELDS: readonly { key: keyof ThemeColors; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "secondary", label: "Secondary" },
  { key: "muted", label: "Muted" },
];

export function EditorPanel({
  store,
  className,
}: {
  store: StoreDto;
  className?: string;
}) {
  // Flattened once per store rather than on every render: `open` below depends on this
  // array's identity, and a new array each render would reset the builder's drafts in a loop.
  const sections = useMemo(
    () => store.pages.flatMap((page) => page.sections),
    [store.pages],
  );

  const open = useBuilderStore((state) => state.open);
  const selectedId = useBuilderStore((state) => state.selectedSectionId);

  // Point the store at this shop. Not a data fetch — it is the one place client state has to
  // be told which server data it is holding drafts for.
  useEffect(() => {
    open(store.id, sections);
  }, [open, store.id, sections]);

  const selected = sections.find((section) => section.id === selectedId);

  return (
    <aside className={cn("flex flex-col overflow-y-auto", className)}>
      {selected === undefined ? (
        <NothingSelected />
      ) : (
        <SectionEditor
          key={selected.id}
          storeId={store.id}
          section={selected}
        />
      )}

      <ThemeEditor colors={store.theme.colors} />
    </aside>
  );
}

function NothingSelected() {
  return (
    <div className="px-5 py-10 text-center">
      <span className="bg-secondary text-muted-foreground mx-auto grid size-11 place-items-center rounded-xl">
        <MousePointerClick className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium">Nothing selected</p>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        Choose a section on the canvas — or in the list — to edit its words.
      </p>
    </div>
  );
}

function SectionEditor({
  storeId,
  section,
}: {
  storeId: string;
  section: SectionDto;
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
  const meta = SECTION_META[section.type];

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
    <div className="border-line border-b px-5 py-5">
      <div className="flex items-center gap-2.5">
        <span className="bg-emerald/8 text-emerald grid size-8 place-items-center rounded-lg">
          <meta.icon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{meta.label}</h2>
          <p className="text-muted-foreground text-[11px]">
            {dirty ? "Unsaved changes" : "Saved"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {fields.map((field, index) => (
          <div key={field.key}>
            <Label
              htmlFor={`field-${field.key}`}
              className="text-muted-foreground text-[11px] font-medium"
            >
              {field.label}
            </Label>
            {field.kind === "text" ? (
              <Input
                id={`field-${field.key}`}
                value={typed[field.key] ?? field.value}
                autoFocus={index === 0}
                disabled={isSaving}
                dir="auto"
                onChange={(event) => {
                  change(field, event.target.value);
                }}
                className="mt-1.5 h-10 rounded-lg text-[13px]"
              />
            ) : (
              <Textarea
                id={`field-${field.key}`}
                value={typed[field.key] ?? field.value}
                rows={field.kind === "lines" ? 5 : 3}
                disabled={isSaving}
                dir="auto"
                onChange={(event) => {
                  change(field, event.target.value);
                }}
                className="mt-1.5 rounded-lg text-[13px]"
              />
            )}
          </div>
        ))}
      </div>

      {invalid !== null && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/8 text-destructive mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
        >
          <AlertCircle
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          {invalid}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!dirty || isSaving}
        className="bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
      >
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="size-4" aria-hidden="true" />
        )}
        {isSaving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

/**
 * The theme controls: four presets and six pickers, all writing custom properties.
 *
 * The pickers are uncontrolled — `defaultValue`, no state — because their value already
 * lives somewhere better: on the canvas element, as the property every section reads. Adding
 * React state would mean two copies of the same colour and a render on every frame of a drag.
 */
function ThemeEditor({ colors }: { colors: ThemeColors }) {
  /**
   * The palette the pickers should *open* on, which after a preset is no longer the store's.
   *
   * This is the one piece of colour state that has to exist in React. The live value lives
   * on the canvas element and is read by the CSS, but an uncontrolled `<input type="color">`
   * only reads `defaultValue` when it mounts — so applying a preset also bumps `presetKey`,
   * which re-mounts the six of them onto the palette below.
   */
  const [palette, setPalette] = useState<ThemeColors>(colors);
  const [presetKey, setPresetKey] = useState(0);

  return (
    <div className="px-5 py-5">
      <h3 className="text-sm font-semibold">Theme</h3>
      <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
        Applied to every section as you drag. Preview only — the API has no
        endpoint that saves a theme yet.
      </p>

      <p className="text-muted-foreground mt-5 text-[10px] font-semibold tracking-[0.16em] uppercase">
        Presets
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              applyBrandTheme(preset);
              setPalette(preset.colors);
              setPresetKey((current) => current + 1);
            }}
            className="border-line hover:border-emerald/30 hover:bg-secondary/60 focus-visible:ring-ring rounded-lg border px-2.5 py-2 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="flex gap-1" aria-hidden="true">
              {[
                preset.colors.primary,
                preset.colors.accent,
                preset.colors.background,
              ].map((hex) => (
                <span
                  key={hex}
                  className="ring-line size-3 rounded-full ring-1"
                  style={{ background: hex }}
                />
              ))}
            </span>
            <span className="mt-1.5 block truncate text-[11px] font-medium">
              {preset.name}
            </span>
          </button>
        ))}
      </div>

      <p className="text-muted-foreground mt-6 text-[10px] font-semibold tracking-[0.16em] uppercase">
        Colours
      </p>
      <ul key={presetKey} className="mt-2.5 space-y-1.5">
        {COLOUR_FIELDS.map((field) => (
          <li
            key={field.key}
            className="hover:bg-secondary/60 flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors"
          >
            <input
              id={`colour-${field.key}`}
              type="color"
              defaultValue={palette[field.key]}
              onChange={(event) => {
                applyBrandColour(field.key, event.target.value);
              }}
              className="border-line size-7 shrink-0 cursor-pointer rounded-md border bg-transparent"
            />
            <Label
              htmlFor={`colour-${field.key}`}
              className="flex-1 cursor-pointer text-[12px] font-normal"
            >
              {field.label}
            </Label>
          </li>
        ))}
      </ul>
    </div>
  );
}
