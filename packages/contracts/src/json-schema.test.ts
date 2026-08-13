import { describe, expect, it } from "vitest";
import { PRODUCTS_PER_STORE } from "./blueprint.schema";
import {
  STORE_BLUEPRINT_TOOL_NAME,
  STORE_BLUEPRINT_TOOL_SCHEMA,
} from "./json-schema";

/**
 * These assertions guard the one place a library upgrade could break generation silently:
 * the tool schema handed to the model. A wrong shape here does not throw, it just makes
 * the model produce something the validator then rejects.
 */
describe("STORE_BLUEPRINT_TOOL_SCHEMA", () => {
  it("is an object schema, which is what tool use requires", () => {
    expect(STORE_BLUEPRINT_TOOL_SCHEMA.type).toBe("object");
    expect(Object.keys(STORE_BLUEPRINT_TOOL_SCHEMA.properties)).toEqual(
      expect.arrayContaining([
        "store",
        "theme",
        "categories",
        "products",
        "pages",
      ]),
    );
  });

  it("inlines every subschema, because models follow flat schemas better than $refs", () => {
    expect(JSON.stringify(STORE_BLUEPRINT_TOOL_SCHEMA)).not.toContain("$ref");
  });

  it("carries the product count into the schema the model actually sees", () => {
    expect(STORE_BLUEPRINT_TOOL_SCHEMA.properties["products"]).toMatchObject({
      minItems: PRODUCTS_PER_STORE,
      maxItems: PRODUCTS_PER_STORE,
    });
  });

  it("names the tool once, so prompt and adapter cannot disagree", () => {
    expect(STORE_BLUEPRINT_TOOL_NAME).toBe("emit_store_blueprint");
  });
});
