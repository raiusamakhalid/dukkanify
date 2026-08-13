import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Section } from './section.entity';

const hero = {
  type: 'HERO',
  headline: 'Oud, aged the long way',
  subheadline: 'Blended in Sharjah, bottled in small batches.',
  ctaLabel: 'Shop the collection',
};

describe('Section.create', () => {
  it('derives the type from the content, so the two cannot disagree', () => {
    expect(Section.create({ id: 'sec-1', content: hero }).type).toBe('HERO');
  });

  it('applies the defaults the contract declares', () => {
    const section = Section.create({ id: 'sec-1', content: hero });

    expect(section.content).toEqual({ ...hero, ctaHref: '#products' });
  });

  it('refuses content that is not one of the known section shapes', () => {
    expect(() =>
      Section.create({ id: 'sec-1', content: { type: 'TESTIMONIALS' } }),
    ).toThrow(ValidationError);
  });

  it('refuses a hero missing the headline it is built around', () => {
    expect(() =>
      Section.create({ id: 'sec-1', content: { ...hero, headline: '' } }),
    ).toThrow(ValidationError);
  });

  it('refuses a link that leaves the site', () => {
    // A generated storefront links to itself. `javascript:` and absolute URLs are refused
    // at the contract rather than trusted into an anchor tag.
    expect(() =>
      Section.create({
        id: 'sec-1',
        content: { ...hero, ctaHref: 'javascript:alert(1)' },
      }),
    ).toThrow(ValidationError);
  });

  it('refuses a section with no id', () => {
    expect(() => Section.create({ id: '', content: hero })).toThrow(
      ValidationError,
    );
  });
});

describe('Section.withContent', () => {
  it('returns a new section carrying the edit, leaving the original alone', () => {
    const section = Section.create({ id: 'sec-1', content: hero });

    const edited = section.withContent({ ...hero, headline: 'Oud, aged' });

    expect(edited.id).toBe('sec-1');
    expect(edited.content).toMatchObject({ headline: 'Oud, aged' });
    expect(section.content).toMatchObject({ headline: hero.headline });
  });

  it('refuses to change what kind of section this is', () => {
    const section = Section.create({ id: 'sec-1', content: hero });

    expect(() =>
      section.withContent({
        type: 'RICH_TEXT',
        heading: 'Our story',
        paragraphs: ['Founded in 1998.'],
      }),
    ).toThrow(/cannot be turned into/i);
  });

  it('refuses an edit that empties a required field', () => {
    const section = Section.create({ id: 'sec-1', content: hero });

    expect(() => section.withContent({ ...hero, ctaLabel: '' })).toThrow(
      ValidationError,
    );
  });
});
