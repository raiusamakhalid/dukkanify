import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { StoreBlueprintStructureSchema } from "./blueprint.schema";

/**
 * The third job of the one schema definition: the tool contract sent to the model.
 *
 * `$refStrategy: 'none'` inlines every subschema. Models follow a flat schema markedly
 * better than one threaded with `$ref`s, and the payload is small enough that the
 * duplication costs nothing.
 *
 * Generated from `StoreBlueprintStructureSchema`, not the refined `StoreBlueprintSchema`:
 * JSON Schema has no vocabulary for "this slug must appear in that array", so cross-field
 * rules are unenforceable at generation time and are caught on validation instead — which
 * is exactly what the repair turn exists to fix (architecture.md §7).
 *
 * `zod-to-json-schema` is pinned to 3.24.6, the last release whose types are written
 * against zod's root entry point. From 3.25 it types against `zod/v3`, which declares the
 * same types in a second file; relating the two exceeds TypeScript's recursion limit even
 * for a one-field schema. Pinning is the fix; type gymnastics only moved the error around.
 */

/**
 * The shape Anthropic's `tool.input_schema` requires. Validated rather than asserted:
 * generated output from a third-party library is an external input like any other, and a
 * tool schema that quietly stops being an object schema does not throw — it just degrades
 * generation, which is the hardest kind of failure to notice.
 */
const ToolInputSchemaSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional(),
  })
  .passthrough();

export type ToolInputSchema = z.infer<typeof ToolInputSchemaSchema>;

const generated: unknown = zodToJsonSchema(StoreBlueprintStructureSchema, {
  $refStrategy: "none",
});

/**
 * Built once at module load. If a dependency upgrade ever changes the emitted root shape,
 * this throws on import with a Zod issue naming the field — at boot, not mid-generation.
 */
export const STORE_BLUEPRINT_TOOL_SCHEMA: ToolInputSchema =
  ToolInputSchemaSchema.parse(generated);

/** The tool name the generation prompt and the Claude adapter must agree on. */
export const STORE_BLUEPRINT_TOOL_NAME = "emit_store_blueprint";
