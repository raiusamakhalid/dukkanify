"use client";

import type { StoreDto } from "@dukkanify/contracts";
import { Maximize2, Minimize2, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableStorefront } from "./editable-storefront";

/**
 * The canvas: a browser window with the shop inside it, and the controls for looking at it.
 *
 * The frame is doing real work rather than decoration. Without it the storefront runs to the
 * edges of the pane and reads as "the page you are on"; inside it, with an address bar
 * carrying the shop's own slug, it reads as a document being edited — which is what it is.
 *
 * Nothing here re-mounts. Changing device, zoom or focus changes the *wrapper's* width and
 * transform; the storefront element underneath is the same element throughout, so no image
 * is refetched, no section remounts, and the `--brand-*` properties the colour pickers wrote
 * onto it survive. An iframe would have lost all three.
 */

export type Device = "desktop" | "mobile";

/** A phone's viewport, near enough. Wide enough for the storefront's `sm:` rules to matter. */
const MOBILE_WIDTH = "26rem";

export function Canvas({
  store,
  device,
  onDeviceChange,
  zoom,
  onZoomChange,
  focused,
  onFocusedChange,
}: {
  store: StoreDto;
  device: Device;
  onDeviceChange: (device: Device) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  focused: boolean;
  onFocusedChange: (focused: boolean) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line bg-card/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
        <div
          role="radiogroup"
          aria-label="Preview size"
          className="bg-muted flex gap-0.5 rounded-lg p-0.5"
        >
          {(
            [
              { value: "desktop", label: "Desktop", icon: Monitor },
              { value: "mobile", label: "Mobile", icon: Smartphone },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={device === option.value}
              onClick={() => {
                onDeviceChange(option.value);
              }}
              className={cn(
                "focus-visible:ring-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                device === option.value
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="size-3.5" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="canvas-zoom">
            Zoom
          </label>
          <select
            id="canvas-zoom"
            value={zoom}
            onChange={(event) => {
              onZoomChange(Number(event.target.value));
            }}
            className="border-line bg-card focus-visible:ring-ring rounded-lg border px-2 py-1.5 text-xs font-medium tabular-nums focus-visible:ring-2 focus-visible:outline-none"
          >
            {[0.6, 0.75, 0.9, 1].map((level) => (
              <option key={level} value={level}>
                {Math.round(level * 100)}%
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              onFocusedChange(!focused);
            }}
            aria-pressed={focused}
            className="border-line bg-card text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {focused ? (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden="true" />
            )}
            <span className="sr-only">
              {focused ? "Show the side panels" : "Hide the side panels"}
            </span>
          </button>
        </div>
      </div>

      <div className="bg-muted/40 min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <div
          className="mx-auto transition-[width] duration-500"
          style={{
            width: device === "mobile" ? MOBILE_WIDTH : "100%",
            maxWidth: "100%",
          }}
        >
          {/*
            The CSS `zoom` property rather than `transform: scale`, and the difference is not
            cosmetic: `zoom` participates in layout, so a canvas at 60% occupies 60% of the
            height and the pane scrolls to the end of the shop. A transform would leave two
            fifths of the original height as empty scrollable space underneath it, and would
            need the containing block widened by hand to stop the storefront from also
            getting narrower.
          */}
          <div style={{ zoom }}>
            <div className="border-line bg-card shadow-lifted overflow-hidden rounded-xl border">
              <div className="border-line bg-muted/60 flex items-center gap-2 border-b px-3 py-2">
                <div className="flex gap-1.5" aria-hidden="true">
                  {["#E5A3A3", "#E8D5A3", "#A6CFC0"].map((dot) => (
                    <span
                      key={dot}
                      className="size-2.5 rounded-full"
                      style={{ background: dot }}
                    />
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  className="bg-background text-muted-foreground mx-auto max-w-[60%] truncate rounded-full px-3 py-1 text-[11px]"
                >
                  dukkanify.store/{store.slug}
                </span>
              </div>

              <div className="group/canvas">
                <EditableStorefront store={store} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
