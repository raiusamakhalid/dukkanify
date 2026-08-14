import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The window a storefront is shown inside.
 *
 * It exists to answer a question the reader asks before they ask any other one: *is this
 * the page I am on, or a picture of a different page?* A storefront rendered flush into a
 * marketing section is ambiguous; the same storefront behind a title bar and an address is
 * unmistakably a preview of something else.
 *
 * Decorative through and through — the traffic lights and the address are `aria-hidden`,
 * because a screen reader announcing "three circles, dot com" adds nothing to the storefront
 * underneath, which is the actual content.
 */
export function BrowserFrame({
  children,
  url,
  className,
  bodyClassName,
  tone = "light",
}: {
  children: ReactNode;
  /** The address to show. Omitted, the bar carries the lights and nothing else. */
  url?: string;
  className?: string;
  bodyClassName?: string;
  /** `dark` for a frame sitting on the deep emerald sections. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border",
        dark
          ? "border-white/12 bg-emerald-deep shadow-floating"
          : "border-line bg-card shadow-lifted",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3",
          dark ? "border-white/10 bg-white/[0.03]" : "border-line bg-muted/60",
        )}
      >
        <div className="flex gap-1.5" aria-hidden="true">
          {["#E5A3A3", "#E8D5A3", "#A6CFC0"].map((dot) => (
            <span
              key={dot}
              className="size-2.5 rounded-full"
              style={{ background: dot, opacity: dark ? 0.55 : 0.9 }}
            />
          ))}
        </div>

        {url !== undefined && (
          <div
            aria-hidden="true"
            className={cn(
              "mx-auto max-w-[60%] truncate rounded-full px-3 py-1 text-[11px] tracking-wide",
              dark
                ? "bg-white/[0.06] text-white/55"
                : "bg-background text-muted-foreground",
            )}
          >
            {url}
          </div>
        )}
      </div>

      <div className={cn("overflow-hidden", bodyClassName)}>{children}</div>
    </div>
  );
}
