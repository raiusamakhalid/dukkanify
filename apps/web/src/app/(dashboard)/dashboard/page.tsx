import {
  type StoreSummaryDto,
  StoreSummaryDtoSchema,
} from "@dukkanify/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StoreLifecycleActions } from "@/features/stores/store-lifecycle-actions";
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
 */
export default async function DashboardPage() {
  const [session, stores] = await Promise.all([
    auth(),
    apiAsUser("/store", { schema: z.array(StoreSummaryDtoSchema) }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome {firstNameOf(session?.user?.name)}
          </h1>
          <p className="text-muted-foreground mt-3">
            {stores.length === 0
              ? "Describe a shop and Dukkanify will build it."
              : countLine(stores.length)}
          </p>
        </div>

        {/* Only when there is a list to sit above. On a first visit the empty state below
            carries the same action, and two identical primary buttons on one screen make a
            person choose between them instead of clicking. */}
        {stores.length > 0 && (
          <Link
            href={NEW_STORE_HREF}
            className={buttonVariants({ size: "lg" })}
          >
            Create Store
          </Link>
        )}
      </div>

      {stores.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <li key={store.id}>
              <StoreCard store={store} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Not an empty box with a shrug in it: the first-run state has to teach what a prompt looks
 * like, because a blank dashboard cannot show what the product does.
 */
function EmptyState() {
  return (
    <section className="border-border/60 bg-card mt-12 rounded-xl border p-8 text-center sm:p-12">
      <h2 className="text-xl font-semibold tracking-tight">No stores yet</h2>
      <p className="text-muted-foreground mx-auto mt-3 max-w-md">
        Write one sentence about what you sell — the shop, its look and its
        first eight products are built from it.
      </p>

      <p className="text-muted-foreground mt-6 text-sm">
        For example:{" "}
        <span className="text-foreground bg-secondary box-decoration-clone rounded-md px-2 py-1">
          “Create a luxury perfume store for UAE customers”
        </span>
      </p>

      <Link
        href={NEW_STORE_HREF}
        className={cn(buttonVariants({ size: "lg" }), "mt-8")}
      >
        Create Store
      </Link>
    </section>
  );
}

function StoreCard({ store }: { store: StoreSummaryDto }) {
  return (
    <article className="border-border/60 bg-card flex h-full flex-col rounded-xl border p-6">
      <Link
        href={`/builder/${store.id}`}
        className="focus-visible:ring-ring hover:border-input min-w-0 flex-1 rounded-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {store.name}
          </h2>
          <Badge
            variant={store.status === "PUBLISHED" ? "default" : "secondary"}
          >
            {store.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
        </div>

        {store.tagline !== null && (
          <p
            className="text-muted-foreground mt-2 text-sm"
            lang={store.locale}
            dir={store.direction.toLowerCase()}
          >
            {store.tagline}
          </p>
        )}

        <p className="text-muted-foreground mt-6 text-xs">
          Updated {formatDate(store.updatedAt)} · /{store.slug}
        </p>
      </Link>

      <div className="mt-5">
        <StoreLifecycleActions
          storeId={store.id}
          status={store.status}
          storeName={store.name}
        />
      </div>
    </article>
  );
}

function firstNameOf(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  // "Welcome" alone reads as a finished greeting; "Welcome undefined" reads as a bug.
  return first === undefined || first === "" ? "back" : first;
}

function countLine(count: number): string {
  return count === 1 ? "One store so far." : `${String(count)} stores so far.`;
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
