import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Slug } from '../value-objects/slug.vo';
import { Page, type PageProps } from './page.entity';
import { Section } from './section.entity';

function section(id: string, heading: string): Section {
  return Section.create({
    id,
    content: { type: 'RICH_TEXT', heading, paragraphs: ['Founded in 1998.'] },
  });
}

function pageWith(overrides: Partial<PageProps> = {}): PageProps {
  return {
    id: 'page-1',
    type: 'ABOUT',
    title: 'Our story',
    slug: Slug.create('about'),
    sections: [section('sec-1', 'Our story')],
    ...overrides,
  };
}

describe('Page.create', () => {
  it('keeps sections in the order given, because the array is the order', () => {
    const page = Page.create(
      pageWith({
        sections: [section('sec-1', 'First'), section('sec-2', 'Second')],
      }),
    );

    expect(page.sections.map((item) => item.id)).toEqual(['sec-1', 'sec-2']);
  });

  it('copies the sections it is given, so a later push cannot reach inside', () => {
    const sections = [section('sec-1', 'First')];
    const page = Page.create(pageWith({ sections }));

    sections.push(section('sec-2', 'Second'));

    expect(page.sections).toHaveLength(1);
  });

  it('refuses a page with no sections, which would render as an empty document', () => {
    expect(() => Page.create(pageWith({ sections: [] }))).toThrow(
      ValidationError,
    );
  });

  it('refuses the same section listed twice', () => {
    expect(() =>
      Page.create(
        pageWith({
          sections: [section('sec-1', 'First'), section('sec-1', 'Again')],
        }),
      ),
    ).toThrow(ValidationError);
  });

  it('refuses an untitled page', () => {
    expect(() => Page.create(pageWith({ title: '  ' }))).toThrow(
      ValidationError,
    );
  });

  it('refuses a page type the storefront has no route for', () => {
    expect(() =>
      Page.create(pageWith({ type: 'CHECKOUT' as 'ABOUT' })),
    ).toThrow(ValidationError);
  });
});

describe('Page.findSection', () => {
  const page = Page.create(
    pageWith({
      sections: [section('sec-1', 'First'), section('sec-2', 'Second')],
    }),
  );

  it('finds a section it contains, and where it sits', () => {
    expect(page.findSection('sec-2')).toMatchObject({ position: 1 });
    expect(page.findSection('sec-2')?.section.id).toBe('sec-2');
  });

  it('returns null for one it does not', () => {
    expect(page.findSection('sec-9')).toBe(null);
  });
});
