import {
  type StoreSummaryDto,
  StoreSummaryDtoSchema,
} from "@dukkanify/contracts";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  FileText,
  Pencil,
  Sparkles,
  Store as StoreIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Mashrabiya } from "@/components/mashrabiya";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StoreCover } from "@/features/stores/store-cover";
import { StoreLifecycleActions } from "@/features/stores/store-lifecycle-actions";
import { firstNameOf } from "@/features/shell/require-session";
import { apiAsUser, auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your stores" };

const NEW_STORE_HREF = "/dashboard/new";

/**
 * The signed-in workspace (PDF §4.3): a greeting, one obvious next action, and the stores
 * this account has already made.
 *
 * The list is fetched on the server with the caller's bearer token — never a direct database
 * read from the browser, and never a `useEffect`. The API is what decides whose stores these
 * are, so this page cannot show someone else's by getting a query wrong.
 *
 * The three figures above the grid are counted from that same list rather than fetched:
 * a second round trip to learn how many of an array are published would be a request that
 * exists only because someone did not want to write `filter`.
 */
export default async function DashboardPage() {
  const [session, stores] = await Promise.all([
    auth(),
    apiAsUser("/store", { schema: z.array(StoreSummaryDtoSchema) }),
  ]);

  const published = stores.filter(
    (store) => store.status === "PUBLISHED",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <GreetingHero name={session?.user?.name} storeCount={stores.length} />

      {stores.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <RevealGroup
            as="ul"
            className="mt-8 grid gap-4 sm:grid-cols-3"
            stagger={0.08}
          >
            <Stat
              icon={StoreIcon}
              value={stores.length}
              label={stores.length === 1 ? "Store" : "Stores"}
              detail="Saved to this account"
            />
            <Stat
              icon={Eye}
              value={published}
              label="Published"
              detail="Live on a public link"
            />
            <Stat
              icon={FileText}
              value={stores.length - published}
              label="In draft"
              detail="Only you can see these"
            />
          </RevealGroup>

          <div className="mt-12 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold sm:text-3xl">Your stores</h2>
            <Link
              href={NEW_STORE_HREF}
              className="text-emerald hover:text-emerald-deep focus-visible:ring-ring group inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              New store
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          <RevealGroup
            as="ul"
            className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            stagger={0.07}
          >
            {stores.map((store) => (
              <RevealItem as="li" key={store.id}>
                <StoreCard store={store} />
              </RevealItem>
            ))}
          </RevealGroup>
        </>
      )}
    </div>
  );
}

/**
 * The greeting, on the product's own emerald.
 *
 * The time of day comes from Asia/Dubai rather than the server's clock, for the same reason
 * the dates below do: this product's morning is the UAE's, and a greeting that says "good
 * evening" to someone having breakfast in Sharjah because the region rendering it is in
 * Virginia is worse than no greeting at all.
 */
function GreetingHero({
  name,
  storeCount,
}: {
  name: string | null | undefined;
  storeCount: number;
}) {
  return (
    <section className="bg-emerald-deep bg-aurora-dark relative isolate overflow-hidden rounded-3xl px-6 py-9 sm:px-10 sm:py-12">
      <div
        className="text-gold pointer-events-none absolute inset-0 opacity-[0.08] [mask-image:radial-gradient(60%_80%_at_100%_0%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya
          patternId="mashrabiya-dashboard"
          className="h-full w-full"
        />
      </div>

      <div className="relative max-w-2xl">
        <p className="text-gold text-[11px] font-semibold tracking-[0.2em] uppercase">
          {greetingFor(dubaiHour())}, {firstNameOf(name)}
        </p>

        <h1 className="text-ivory mt-4 text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]">
          What are you building today?
        </h1>

        <p className="text-ivory/60 mt-4 text-base leading-relaxed sm:text-lg">
          {storeCount === 0
            ? "Describe a shop in one sentence and Dukkanify builds it — theme, catalogue and pages."
            : "Pick up where you left off, or describe another shop and let the AI build it."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={NEW_STORE_HREF}
            className="bg-gold text-emerald-deep focus-visible:ring-gold group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold shadow-lifted transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-deep focus-visible:outline-none"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Create Store with AI
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
              aria-hidden="true"
            />
          </Link>

          {storeCount > 0 && (
            <p className="text-ivory/45 text-sm">
              {storeCount === 1
                ? "One store so far."
                : `${String(storeCount)} stores so far.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  detail,
}: {
  icon: typeof StoreIcon;
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <RevealItem
      as="li"
      className="border-line bg-card shadow-soft rounded-2xl border p-5"
    >
      <div className="flex items-center gap-3">
        <span className="bg-emerald/8 text-emerald grid size-9 place-items-center rounded-xl">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="font-heading text-3xl font-semibold tabular-nums">
          {value}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
      <p className="text-muted-foreground mt-1 text-sm">{detail}</p>
    </RevealItem>
  );
}

/**
 * Not an empty box with a shrug in it: the first-run state has to teach what a prompt looks
 * like, because a blank dashboard cannot show what the product does.
 */
function EmptyState() {
  return (
    <section className="border-line bg-card shadow-soft relative mt-8 overflow-hidden rounded-3xl border px-6 py-14 text-center sm:px-12 sm:py-20">
      <div
        aria-hidden="true"
        className="bg-gold/10 pointer-events-none absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full blur-[90px]"
      />

      <div className="relative">
        <span className="bg-emerald/8 text-emerald mx-auto grid size-14 place-items-center rounded-2xl">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>

        <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">
          Your first store is waiting.
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-md leading-relaxed">
          Describe what you sell in one sentence and Dukkanify builds the
          foundation — a theme, a hero, categories, eight priced products and
          the pages around them.
        </p>

        <p className="text-muted-foreground mt-8 text-sm">
          For example{" "}
          {/* `box-decoration-clone` so the highlight keeps its padding and corners on both
              lines when it wraps on a narrow screen, instead of shearing off mid-phrase. */}
          <span className="text-foreground bg-secondary box-decoration-clone rounded-md px-2 py-1">
            “Create a luxury perfume store for UAE customers”
          </span>
        </p>

        <Link
          href={NEW_STORE_HREF}
          className="bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring shadow-lifted group mt-9 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-medium transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Create Store with AI
        </Link>
      </div>
    </section>
  );
}

function StoreCard({ store }: { store: StoreSummaryDto }) {
  return (
    <article className="border-line bg-card shadow-soft hover:shadow-lifted group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-1">
      <Link
        href={`/builder/${store.id}`}
        className="focus-visible:ring-ring relative block aspect-[16/10] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none"
      >
        <StoreCover
          name={store.name}
          tagline={store.tagline}
          slug={store.slug}
          className="absolute inset-0"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 380px"
        />

        <Badge
          variant={store.status === "PUBLISHED" ? "default" : "secondary"}
          className={cn(
            "absolute top-3 end-3 backdrop-blur-md",
            store.status === "PUBLISHED"
              ? "bg-emerald text-ivory"
              : "bg-ivory/85 text-emerald-deep",
          )}
        >
          {store.status === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>

        {/* Appears on hover and on keyboard focus, never on tap-only devices where a hover
            state would be a control nobody can reach. */}
        <span className="bg-ivory text-emerald-deep absolute bottom-3 end-3 inline-flex translate-y-2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          Open builder
          <ArrowUpRight
            className="size-3.5 rtl:-scale-x-100"
            aria-hidden="true"
          />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link
          href={`/builder/${store.id}`}
          className="focus-visible:ring-ring min-w-0 rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <h3 className="font-heading truncate text-lg font-semibold">
            {store.name}
          </h3>
        </Link>

        {store.tagline !== null && (
          <p
            className="text-muted-foreground mt-1.5 line-clamp-2 flex-1 text-sm"
            lang={store.locale}
            dir={store.direction.toLowerCase()}
          >
            {store.tagline}
          </p>
        )}

        <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
          <Pencil className="size-3" aria-hidden="true" />
          Updated {formatDate(store.updatedAt)} · /{store.slug}
        </p>

        <div className="border-line mt-5 border-t pt-4">
          <StoreLifecycleActions
            storeId={store.id}
            status={store.status}
            storeName={store.name}
          />
        </div>
      </div>
    </article>
  );
}

/**
 * Fixed locale and time zone, not the server's: a date rendered on the server and read in
 * Dubai should say the same thing on every deployment, and this product's day is the UAE's.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dubai",
});

function formatDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(isoDate));
}

const HOUR_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hour12: false,
  timeZone: "Asia/Dubai",
});

function dubaiHour(): number {
  return Number(HOUR_FORMAT.format(new Date()));
}

function greetingFor(hour: number): string {
  if (hour < 12) {
    return "Good morning";
  }
  return hour < 18 ? "Good afternoon" : "Good evening";
}
