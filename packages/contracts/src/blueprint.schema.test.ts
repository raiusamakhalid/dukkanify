import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { PRODUCTS_PER_STORE, StoreBlueprintSchema } from "./blueprint.schema";
import { directionForLocale } from "./enums";
import { themeToCssVariables, ThemeTokensSchema } from "./theme.schema";

type BlueprintInput = z.input<typeof StoreBlueprintSchema>;

/**
 * A blueprint of the shape the challenge brief asks for: a UAE perfume house, three
 * categories, eight products, home/about/contact. Real copy, because a fixture full of
 * placeholder text proves the schema accepts placeholder text.
 */
function validBlueprint(): BlueprintInput {
  return {
    store: {
      name: "Dar Al Oud",
      tagline: "Attar, oud and bakhoor blended in Dubai since 1974",
      locale: "en",
      currency: "AED",
    },
    theme: {
      colors: {
        primary: "#7A4A2B",
        secondary: "#C9A227",
        accent: "#B08D57",
        background: "#F6EFE4",
        foreground: "#2A1B10",
        muted: "#D8C7AE",
      },
      fonts: { display: "ibm-plex-sans-arabic", body: "source-serif-4" },
      radius: "0.75rem",
      spacing: "generous",
    },
    categories: [
      { name: "Oud & Attar", slug: "oud-and-attar" },
      { name: "Bakhoor & Incense", slug: "bakhoor-and-incense" },
      { name: "Gift Sets", slug: "gift-sets" },
    ],
    products: [
      {
        name: "Royal Cambodi Oud",
        description: "Aged Cambodian oud oil, deep and resinous.",
        price: 1450,
        sku: "OUD-CAMBODI-01",
        categorySlug: "oud-and-attar",
      },
      {
        name: "Hindi Oud Muattar",
        description: "Smoky Hindi oud, matured for twelve years.",
        price: 980.5,
        sku: "OUD-HINDI-02",
        categorySlug: "oud-and-attar",
      },
      {
        name: "Rose Taifi Attar",
        description: "Taif rose distilled into a soft, honeyed attar.",
        price: 420,
        sku: "ATR-ROSE-03",
        categorySlug: "oud-and-attar",
      },
      {
        name: "Musk Al Haramain",
        description: "White musk with a powdery, lingering finish.",
        price: 260,
        sku: "ATR-MUSK-04",
        categorySlug: "oud-and-attar",
      },
      {
        name: "Bakhoor Al Layl",
        description: "Night-blend bakhoor of oud chips, amber and rose.",
        price: 185,
        sku: "BKH-LAYL-05",
        categorySlug: "bakhoor-and-incense",
      },
      {
        name: "Mabsous Sandal",
        description: "Sandalwood mabsous that scents a majlis for hours.",
        price: 145,
        sku: "BKH-SANDAL-06",
        categorySlug: "bakhoor-and-incense",
      },
      {
        name: "Majlis Gift Coffret",
        description: "Three attars and a brass burner in a lined box.",
        price: 1290,
        sku: "GFT-MAJLIS-07",
        categorySlug: "gift-sets",
      },
      {
        name: "Eid Discovery Set",
        description: "Six two-millilitre attars for gifting at Eid.",
        price: 540,
        sku: "GFT-EID-08",
        categorySlug: "gift-sets",
      },
    ],
    pages: [
      {
        type: "HOME",
        title: "Dar Al Oud",
        slug: "home",
        sections: [
          {
            type: "HERO",
            headline: "Oud worthy of a majlis",
            subheadline:
              "Blended in Dubai, aged in Deira, delivered across the Emirates in two days.",
            ctaLabel: "Shop the collection",
            ctaHref: "#products",
          },
          {
            type: "CATEGORY_GRID",
            heading: "Browse the house",
            categorySlugs: [
              "oud-and-attar",
              "bakhoor-and-incense",
              "gift-sets",
            ],
          },
          {
            type: "PRODUCT_GRID",
            heading: "This season",
            limit: 8,
          },
        ],
      },
      {
        type: "ABOUT",
        title: "Our house",
        slug: "about",
        sections: [
          {
            type: "RICH_TEXT",
            heading: "Three generations of blending",
            paragraphs: [
              "Dar Al Oud began as a single counter in Deira, selling oud chips weighed on brass scales.",
              "We still age our own oils, and still blend by nose rather than by formula.",
            ],
          },
        ],
      },
      {
        type: "CONTACT",
        title: "Visit us",
        slug: "contact",
        sections: [
          {
            type: "CONTACT",
            heading: "Come and smell for yourself",
            email: "majlis@daraloud.ae",
            phone: "+971 4 504 4058",
            whatsapp: "+971 50 123 4567",
            addressLines: [
              "Al Saqr Business Tower",
              "Sheikh Zayed Road, Dubai",
            ],
          },
        ],
      },
    ],
  };
}

describe("StoreBlueprintSchema", () => {
  it("accepts a complete blueprint", () => {
    const result = StoreBlueprintSchema.safeParse(validBlueprint());
    expect(result.success).toBe(true);
  });

  it("fills the defaults a model is allowed to omit", () => {
    const blueprint = validBlueprint();
    blueprint.pages = blueprint.pages.map((page) =>
      page.type === "HOME"
        ? {
            ...page,
            sections: [
              {
                type: "HERO" as const,
                headline: "Oud worthy of a majlis",
                subheadline: "Blended in Dubai.",
                ctaLabel: "Shop",
              },
              { type: "PRODUCT_GRID" as const, heading: "This season" },
            ],
          }
        : page,
    );

    const result = StoreBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    const home = result.data.pages.find((page) => page.type === "HOME");
    expect(home?.sections[0]).toMatchObject({
      type: "HERO",
      ctaHref: "#products",
    });
    expect(home?.sections[1]).toMatchObject({ type: "PRODUCT_GRID", limit: 8 });
  });

  it(`requires exactly ${PRODUCTS_PER_STORE} products`, () => {
    expect(PRODUCTS_PER_STORE).toBe(8);

    const tooFew = validBlueprint();
    tooFew.products = tooFew.products.slice(0, 7);
    expect(StoreBlueprintSchema.safeParse(tooFew).success).toBe(false);

    const tooMany = validBlueprint();
    const [first] = tooMany.products;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    tooMany.products = [...tooMany.products, { ...first, sku: "OUD-EXTRA-09" }];
    expect(StoreBlueprintSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects a colour that is not hex", () => {
    const blueprint = validBlueprint();
    blueprint.theme.colors.primary = "desert sand";

    const result = StoreBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues[0]?.path).toEqual([
      "theme",
      "colors",
      "primary",
    ]);
  });

  it("rejects a product pointing at a category that was never generated", () => {
    const blueprint = validBlueprint();
    blueprint.products = blueprint.products.map((product, index) =>
      index === 0 ? { ...product, categorySlug: "ghost-category" } : product,
    );

    const result = StoreBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    const issue = result.error.issues[0];
    expect(issue?.path).toEqual(["products", 0, "categorySlug"]);
    // The repair turn is only as good as the message it is handed back.
    expect(issue?.message).toContain("ghost-category");
    expect(issue?.message).toContain("oud-and-attar");
  });

  it("rejects a section pointing at a category that was never generated", () => {
    const blueprint = validBlueprint();
    blueprint.pages = blueprint.pages.map((page) =>
      page.type === "HOME"
        ? {
            ...page,
            sections: page.sections.map((section) =>
              section.type === "CATEGORY_GRID"
                ? {
                    ...section,
                    categorySlugs: ["oud-and-attar", "ghost-category"],
                  }
                : section,
            ),
          }
        : page,
    );

    const result = StoreBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues[0]?.message).toContain("ghost-category");
  });

  it("rejects duplicate category slugs, which the database would refuse anyway", () => {
    const blueprint = validBlueprint();
    blueprint.categories = blueprint.categories.map((category) => ({
      ...category,
      slug: "oud-and-attar",
    }));

    expect(StoreBlueprintSchema.safeParse(blueprint).success).toBe(false);
  });

  it("requires one page of every type", () => {
    const blueprint = validBlueprint();
    blueprint.pages = blueprint.pages.map((page) =>
      page.type === "ABOUT" ? { ...page, type: "HOME" as const } : page,
    );

    const result = StoreBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("exactly one ABOUT page"),
      ]),
    );
  });

  it("requires a hero on the home page", () => {
    const blueprint = validBlueprint();
    blueprint.pages = blueprint.pages.map((page) =>
      page.type === "HOME"
        ? {
            ...page,
            sections: page.sections.filter(
              (section) => section.type !== "HERO",
            ),
          }
        : page,
    );

    const result = StoreBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([expect.stringContaining("HERO section")]),
    );
  });

  it("refuses a call to action that leaves the site", () => {
    const blueprint = validBlueprint();
    blueprint.pages = blueprint.pages.map((page) =>
      page.type === "HOME"
        ? {
            ...page,
            sections: page.sections.map((section) =>
              section.type === "HERO"
                ? { ...section, ctaHref: "https://not-this-store.example.com" }
                : section,
            ),
          }
        : page,
    );

    expect(StoreBlueprintSchema.safeParse(blueprint).success).toBe(false);
  });

  it("rejects a price that is not a positive amount", () => {
    const blueprint = validBlueprint();
    blueprint.products = blueprint.products.map((product, index) =>
      index === 0 ? { ...product, price: 0 } : product,
    );

    expect(StoreBlueprintSchema.safeParse(blueprint).success).toBe(false);
  });

  it("strips keys the model was not asked for", () => {
    const withExtras = {
      ...validBlueprint(),
      invented: "a field nobody asked for",
    };

    const result = StoreBlueprintSchema.safeParse(withExtras);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data).not.toHaveProperty("invented");
  });
});

describe("theme", () => {
  it("maps every token to a brand custom property", () => {
    const theme = ThemeTokensSchema.parse(validBlueprint().theme);

    expect(themeToCssVariables(theme)).toEqual({
      "--brand-primary": "#7A4A2B",
      "--brand-secondary": "#C9A227",
      "--brand-accent": "#B08D57",
      "--brand-bg": "#F6EFE4",
      "--brand-fg": "#2A1B10",
      "--brand-muted": "#D8C7AE",
      "--brand-radius": "0.75rem",
    });
  });

  it("rejects a radius that is not a usable CSS length", () => {
    const theme = { ...validBlueprint().theme, radius: "rounded" };

    expect(ThemeTokensSchema.safeParse(theme).success).toBe(false);
  });
});

describe("directionForLocale", () => {
  it("derives reading direction so nothing has to keep the two in agreement", () => {
    expect(directionForLocale("ar")).toBe("RTL");
    expect(directionForLocale("en")).toBe("LTR");
  });
});
