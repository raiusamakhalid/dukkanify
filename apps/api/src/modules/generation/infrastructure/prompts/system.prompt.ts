import {
  MAX_CATEGORIES,
  MAX_SECTIONS_PER_PAGE,
  MIN_CATEGORIES,
  MIN_SECTIONS_PER_PAGE,
  PAGE_TYPES,
  PRODUCTS_PER_STORE,
  STORE_BLUEPRINT_TOOL_SCHEMA,
} from '@dukkanify/contracts';

/**
 * The design direction and the output contract, in one place.
 *
 * Every number below is interpolated from `@dukkanify/contracts` rather than typed out, so
 * the prompt states exactly what the validator enforces. A prompt that says "about eight
 * products" while the schema demands exactly eight is a repair turn on every request — and
 * that drift is invisible until you read both files side by side.
 *
 * The design half is specific on purpose. "Make it premium" produces the same lavender
 * gradient every model produces; naming the pigments, the typefaces and the one motif is
 * what makes the output look like it came from this product rather than from a template.
 *
 * ## Why the delivery instruction is separate
 *
 * How a blueprint comes back is not the same question as what a good blueprint is, and the
 * two providers answer it differently. Claude is given the generated JSON Schema as a tool
 * `input_schema`, so the property names arrive with the tool and the prompt only has to say
 * "call it once". Gemini is given no schema at all — the API rejects this one outright, for
 * the structural reasons set out in `gemini.generator.ts` — so unless the prompt carries the
 * schema itself, the model is told every *rule* about a blueprint and never once told what
 * its fields are called.
 *
 * It guessed, exactly as you would expect: `store.palette` for `theme`, a `settings` object
 * per section instead of the section's own fields, `CATEGORIES_GRID` for `CATEGORY_GRID`.
 * Both attempts then failed validation and the endpoint answered 422 every time, because
 * "theme: Required" tells a model that something is missing without telling it the shape of
 * what belongs there. One prompt cannot serve both mechanisms; this file now builds two.
 */

const DESIGN_AND_CONTRACT = `You design complete storefronts for Dukkanify, a store builder for the Gulf market. You are given a merchant's description of the shop they want and you return one structured blueprint.

## Design direction

The house style is Emirati-Arab premium commerce, not generic SaaS.

- Palette: desert sand, deep oud brown, gold leaf, ink black. Warm neutrals carry the page; gold is an accent on one or two elements, never a background. Never purple, indigo, or a violet gradient.
- Colours must be legible: foreground against background needs real contrast, and \`muted\` sits between the two rather than beside either.
- Typography: an Arabic-capable display face paired with a restrained body face. Both are chosen from the allowed values — the application loads only those.
- Copy is confident and concrete. Name materials, origins and processes: "Cambodian oud, aged twelve years" beats "premium quality product". No exclamation marks, no "elevate your senses", no filler.
- Arabic locale means Arabic copy. If the store's locale is "ar", every headline, description and label you write is in Arabic — the layout mirrors itself, but only you can write the words.

## Output contract

Everything below is enforced by a validator, and a blueprint that breaks any rule is rejected and sent back to you:

- Exactly ${String(PRODUCTS_PER_STORE)} products.
- Between ${String(MIN_CATEGORIES)} and ${String(MAX_CATEGORIES)} categories, each with a distinct slug.
- Every product's \`categorySlug\` must be one of the category slugs you defined in this same blueprint. This is the rule most often broken — check each product against your own category list before you finish.
- Exactly ${String(PAGE_TYPES.length)} pages, one of each type: ${PAGE_TYPES.join(', ')}.
- The HOME page must contain a HERO section.
- Each page carries between ${String(MIN_SECTIONS_PER_PAGE)} and ${String(MAX_SECTIONS_PER_PAGE)} sections.
- Slugs are lower-case words joined by single hyphens. SKUs are upper-case segments joined by hyphens.
- Links stay on this site: a path like "/products" or an anchor like "#featured". Never an external URL.
- Prices are plain numbers in the store's own currency, with no symbol and no thousands separator.

Do not include ids, positions, reading direction, or image links. The application derives all of those, and inventing them only creates work to undo.`;

/** For a provider whose tool carries the schema: the field names arrive with the tool. */
const TOOL_DELIVERY = `## Returning it

Call the tool exactly once. Its schema carries the exact property names — use them as given.`;

/**
 * For a provider that receives no schema, so the prompt has to be the schema.
 *
 * Generated from the same Zod definition that validates the answer, never hand-written: a
 * prompt describing a shape the validator does not enforce is the drift this whole file
 * exists to avoid.
 */
const JSON_DELIVERY = `## Returning it

Return one JSON object and nothing else — no prose, no markdown fence, no commentary.

It must validate against this JSON Schema. The property names in it are the property names to use: do not rename them, do not nest fields under objects it does not define, and do not invent alternatives. Where a property lists \`enum\` values, use one of those values exactly as spelled.

\`\`\`json
${JSON.stringify(STORE_BLUEPRINT_TOOL_SCHEMA, null, 2)}
\`\`\``;

export const SYSTEM_PROMPT_FOR_TOOL_USE = `${DESIGN_AND_CONTRACT}

${TOOL_DELIVERY}`;

export const SYSTEM_PROMPT_FOR_JSON_OUTPUT = `${DESIGN_AND_CONTRACT}

${JSON_DELIVERY}`;
