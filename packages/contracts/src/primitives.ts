import { z } from "zod";

/**
 * Shared leaf schemas. Every schema in this package is built from these, so a rule
 * about what a slug or a colour is exists exactly once.
 */

/** Non-empty, trimmed, length-capped text. The cap is always deliberate, never a guess. */
export function text(maxLength: number): z.ZodString {
  return z.string().trim().min(1).max(maxLength);
}

/**
 * Identifiers come from Prisma's `cuid()`. The generator's flavour is Prisma's business,
 * so this validates that an id is present rather than asserting a format that a Prisma
 * upgrade could change underneath us.
 */
export const IdSchema = z.string().min(1).max(64);

export const SlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be lower-case alphanumeric words joined by single hyphens, e.g. "oud-and-attar"',
  );

/** SKUs are generated upper-case; hyphens and digits only, so they stay URL- and CSV-safe. */
export const SkuSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(
    /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
    'must be upper-case alphanumeric segments joined by hyphens, e.g. "OUD-ROYAL-01"',
  );

export const HexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    'must be a hex colour such as "#1B120B"',
  );

/** A CSS length the browser can use verbatim as a custom property value. */
export const CssLengthSchema = z
  .string()
  .regex(
    /^(?:0|\d{1,3}(?:\.\d{1,4})?(?:px|rem))$/,
    'must be a CSS length in px or rem, e.g. "0.75rem"',
  );

/**
 * Links a generated storefront is allowed to contain: same-site paths and in-page anchors
 * only. A model that emits `https://…` or `javascript:` is refused at the contract rather
 * than trusted into an anchor tag.
 */
export const InternalHrefSchema = z
  .string()
  .max(200)
  .regex(
    /^[#/][A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=]*$/,
    'must be a same-site path or an in-page anchor, e.g. "/products" or "#featured"',
  );

export const EmailSchema = z.string().trim().email().max(160);

export const PhoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+?[0-9][0-9 ()-]{6,19}$/,
    'must be a dialable number, e.g. "+971 4 504 4058"',
  );

export const IsoDateTimeSchema = z.string().datetime();

/**
 * Money leaves the API as a fixed-point string, never a JSON number: binary floating
 * point cannot represent 19.99, and `Decimal(10,2)` in the database can.
 */
export const MoneyStringSchema = z
  .string()
  .regex(
    /^\d{1,8}\.\d{2}$/,
    'must be an amount with exactly two decimal places, e.g. "249.00"',
  );

/**
 * Currencies the storefront can render. GCC first, since the product is UAE-facing; USD
 * because a UAE store selling abroad is the obvious next case.
 */
export const CURRENCIES = [
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "OMR",
  "BHD",
  "USD",
] as const;
export const CurrencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof CurrencySchema>;

/** Arabic is a first-class locale from the first migration, not a later toggle. */
export const LOCALES = ["en", "ar"] as const;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;
