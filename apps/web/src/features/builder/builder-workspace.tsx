"use client";

import type { StoreDto } from "@dukkanify/contracts";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Layers,
  MonitorPlay,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { StoreLifecycleActions } from "@/features/stores/store-lifecycle-actions";
import { cn } from "@/lib/utils";
import { useDirtyCount } from "./builder-store";
import { Canvas, type Device } from "./canvas";
import { EditorPanel } from "./editor-panel";
import { SectionRail } from "./section-rail";

/**
 * The builder, as three panes and a bar.
 *
 * Structure on the left, the shop in the middle, its properties on the right — the
 * arrangement every design tool has converged on, because it is the one where the thing being
 * worked on is the largest object on the screen. The previous version put the storefront in a
 * column beside a card and gave the canvas about a third of a laptop.
 *
 * Below `lg` the three panes become one pane and a tab bar. That is not a shrunken desktop:
 * a phone cannot show a canvas and its controls at once, so it shows the canvas *first* and
 * lets the other two be summoned. `hidden`/`flex` rather than conditional rendering, so
 * switching tabs never unmounts the canvas — which would drop the `--brand-*` properties the
 * colour pickers wrote onto it and refetch every product image.
 */

type Pane = "canvas" | "sections" | "editor";

const TABS: readonly { value: Pane; label: string; icon: typeof Layers }[] = [
  { value: "sections", label: "Sections", icon: Layers },
  { value: "canvas", label: "Preview", icon: MonitorPlay },
  { value: "editor", label: "Edit", icon: SlidersHorizontal },
];

export function BuilderWorkspace({ store }: { store: StoreDto }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState(1);
  const [focused, setFocused] = useState(false);
  const [pane, setPane] = useState<Pane>("canvas");

  const dirty = useDirtyCount();

  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      <TopBar store={store} dirty={dirty} />

      <div className="flex min-h-0 flex-1">
        <SectionRail
          store={store}
          onSelect={() => {
            setPane("editor");
          }}
          className={cn(
            "border-line bg-card w-full shrink-0 border-e lg:w-64",
            focused ? "lg:hidden" : "lg:flex",
            pane === "sections" ? "flex" : "hidden",
          )}
        />

        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            pane === "canvas" ? "flex" : "hidden lg:flex",
          )}
        >
          <Canvas
            store={store}
            device={device}
            onDeviceChange={setDevice}
            zoom={zoom}
            onZoomChange={setZoom}
            focused={focused}
            onFocusedChange={setFocused}
          />
        </div>

        <EditorPanel
          store={store}
          className={cn(
            "border-line bg-card w-full shrink-0 border-s lg:w-80",
            focused ? "lg:hidden" : "lg:flex",
            pane === "editor" ? "flex" : "hidden",
          )}
        />
      </div>

      <nav
        aria-label="Builder panes"
        className="border-line bg-card flex shrink-0 border-t lg:hidden"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-current={pane === tab.value ? "true" : undefined}
            onClick={() => {
              setPane(tab.value);
            }}
            className={cn(
              "focus-visible:ring-ring flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
              pane === tab.value ? "text-emerald" : "text-muted-foreground",
            )}
          >
            <tab.icon className="size-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TopBar({ store, dirty }: { store: StoreDto; dirty: number }) {
  const published = store.status === "PUBLISHED";

  return (
    <header className="border-line bg-card flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5 sm:px-4">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <LogoMark className="size-8" />
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        <span className="sr-only">Back to your stores</span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-semibold">{store.name}</h1>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              published
                ? "bg-emerald/10 text-emerald"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {published ? "Published" : "Draft"}
          </span>
          {dirty > 0 && (
            <span
              className="bg-gold/15 text-gold shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              aria-live="polite"
            >
              {dirty} unsaved
            </span>
          )}
        </div>
        <p className="text-muted-foreground truncate text-[11px]">
          Generated from “{store.prompt}”
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/builder/${store.id}/preview`}
          className="border-input text-foreground hover:bg-secondary focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Eye className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Preview</span>
        </Link>

        {published && (
          <a
            href={`/preview/${store.slug}`}
            target="_blank"
            rel="noreferrer"
            className="border-input text-foreground hover:bg-secondary focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ExternalLink
              className="size-3.5 rtl:-scale-x-100"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">View live</span>
          </a>
        )}

        <StoreLifecycleActions
          storeId={store.id}
          status={store.status}
          storeName={store.name}
        />
      </div>
    </header>
  );
}
