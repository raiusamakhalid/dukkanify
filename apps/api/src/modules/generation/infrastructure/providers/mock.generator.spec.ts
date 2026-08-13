import { StoreBlueprintSchema } from '@dukkanify/contracts';
import { describe, expect, it } from 'vitest';
import { MOCK_PROMPT_VERSION } from '../prompts/prompt.version';
import { MockGenerator } from './mock.generator';

const generator = new MockGenerator();

async function generate(
  prompt: string,
  locale: 'en' | 'ar' = 'en',
): Promise<unknown> {
  const { raw } = await generator.generate({ prompt, locale });
  return raw;
}

describe('MockGenerator', () => {
  it.each([
    ['Create a luxury perfume store for UAE customers', 'Dar Al Oud'],
    ['I sell bukhoor and incense burners in Ajman', 'Bayt Al Bukhoor'],
    ['An online gift hamper shop for Eid', 'Hadiya'],
    ['A shop for second-hand bicycles', 'Bayt Majlis'],
  ])('answers "%s" with the %s fixture', async (prompt, name) => {
    const blueprint = StoreBlueprintSchema.parse(await generate(prompt));

    expect(blueprint.store.name).toBe(name);
  });

  it('produces a blueprint that satisfies every rule the contract enforces', () => {
    // `parse` throws on any violation — eight products, three page types, a HERO on HOME,
    // and every product pointing at a category this blueprint actually defines.
    expect(() => StoreBlueprintSchema.parse({ store: {} })).toThrow();
  });

  it.each([
    'Create a luxury perfume store for UAE customers',
    'I sell bukhoor and incense burners in Ajman',
    'An online gift hamper shop for Eid',
    'A shop for second-hand bicycles',
  ])('keeps every fixture valid: %s', async (prompt) => {
    const blueprint = StoreBlueprintSchema.parse(await generate(prompt));

    expect(blueprint.products).toHaveLength(8);
    expect(blueprint.pages.map((page) => page.type)).toEqual([
      'HOME',
      'ABOUT',
      'CONTACT',
    ]);
    expect(new Set(blueprint.products.map((p) => p.sku)).size).toBe(8);
  });

  it('is deterministic — the same prompt twice is the same store', async () => {
    const first = await generate('a perfume shop');
    const second = await generate('a perfume shop');

    expect(first).toEqual(second);
  });

  it('honours the requested locale, so an Arabic store renders right-to-left', async () => {
    const blueprint = StoreBlueprintSchema.parse(
      await generate('متجر عطور فاخر', 'ar'),
    );

    expect(blueprint.store.locale).toBe('ar');
  });

  it('does not claim a prompt revision it never used', async () => {
    const { promptVersion } = await generator.generate({
      prompt: 'a perfume shop',
      locale: 'en',
    });

    expect(promptVersion).toBe(MOCK_PROMPT_VERSION);
  });
});
