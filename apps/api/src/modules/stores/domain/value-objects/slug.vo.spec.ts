import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Slug } from './slug.vo';

/** No framework, no container, no database — the point of the layer being what it is. */

describe('Slug.create', () => {
  it('accepts a canonical slug', () => {
    expect(Slug.create('oud-and-attar').value).toBe('oud-and-attar');
  });

  it.each([
    ['Oud-Attar', 'upper case'],
    ['oud attar', 'a space'],
    ['oud--attar', 'a double hyphen'],
    ['-oud', 'a leading hyphen'],
    ['oud-', 'a trailing hyphen'],
    ['', 'nothing at all'],
  ])('refuses "%s" — %s', (value) => {
    expect(() => Slug.create(value)).toThrow(ValidationError);
  });
});

describe('Slug.fromText', () => {
  it.each([
    ['Oud & Attar', 'oud-attar'],
    ['  Royal   Bukhoor  ', 'royal-bukhoor'],
    ['Café Perfumerie', 'cafe-perfumerie'],
    ['Dukkan 2026!', 'dukkan-2026'],
  ])('derives "%s" into "%s"', (input, expected) => {
    expect(Slug.fromText(input).value).toBe(expected);
  });

  it('caps a long name at the length the column allows, with no trailing hyphen', () => {
    const slug = Slug.fromText(`${'luxury '.repeat(20)}perfume`);

    expect(slug.value.length).toBeLessThanOrEqual(64);
    expect(slug.value.endsWith('-')).toBe(false);
  });

  it('refuses text that leaves nothing behind, rather than inventing a slug', () => {
    // Arabic normalises to no ASCII at all. Choosing what to call that store is a product
    // decision, so it belongs to the caller, not to this constructor.
    expect(() => Slug.fromText('عطور فاخرة')).toThrow(ValidationError);
  });

  it('answers null for the same text when the caller has a fallback ready', () => {
    expect(Slug.tryFromText('عطور فاخرة')).toBe(null);
    expect(Slug.tryFromText('Oud & Attar')?.value).toBe('oud-attar');
  });
});

describe('Slug.withSuffix', () => {
  it('appends a disambiguator', () => {
    expect(Slug.create('oud-attar').withSuffix('2').value).toBe('oud-attar-2');
  });

  it('trims the base so a long slug still fits the column', () => {
    const long = Slug.create('a'.repeat(64));

    const suffixed = long.withSuffix('2');

    expect(suffixed.value.length).toBe(64);
    expect(suffixed.value.endsWith('-2')).toBe(true);
  });
});

describe('Slug', () => {
  it('compares by value', () => {
    expect(Slug.create('attar').equals(Slug.create('attar'))).toBe(true);
    expect(Slug.create('attar').equals(Slug.create('bukhoor'))).toBe(false);
  });
});
