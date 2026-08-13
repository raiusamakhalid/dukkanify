import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Money } from '../value-objects/money.vo';
import { Product, type ProductProps } from './product.entity';

function productWith(overrides: Partial<ProductProps> = {}): ProductProps {
  return {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: 'Royal Oud Attar',
    description: 'A twelve-hour maceration of Cambodian oud and Taif rose.',
    price: Money.fromDecimalString('249.00', 'AED'),
    sku: 'OUD-ROYAL-01',
    imageUrl: null,
    ...overrides,
  };
}

describe('Product.create', () => {
  it('keeps the price as money, not as a number', () => {
    const product = Product.create(productWith());

    expect(product.price.toDecimalString()).toBe('249.00');
    expect(product.price.currency).toBe('AED');
  });

  it('trims the text it is given', () => {
    expect(Product.create(productWith({ name: '  Royal Oud  ' })).name).toBe(
      'Royal Oud',
    );
  });

  it('allows a product with no category, because a product outlives its category', () => {
    expect(Product.create(productWith({ categoryId: null })).categoryId).toBe(
      null,
    );
  });

  it('refuses a product that costs nothing', () => {
    expect(() =>
      Product.create(productWith({ price: Money.fromMinorUnits(0, 'AED') })),
    ).toThrow(ValidationError);
  });

  it('refuses an unnamed product', () => {
    expect(() => Product.create(productWith({ name: '   ' }))).toThrow(
      ValidationError,
    );
  });

  it('refuses a description longer than the column allows', () => {
    expect(() =>
      Product.create(productWith({ description: 'a'.repeat(401) })),
    ).toThrow(ValidationError);
  });

  it.each(['oud-royal-01', 'OUD ROYAL', 'OU', 'OUD_ROYAL'])(
    'refuses the SKU "%s"',
    (sku) => {
      expect(() => Product.create(productWith({ sku }))).toThrow(
        ValidationError,
      );
    },
  );

  it('refuses a blank image URL, which renders as a broken image', () => {
    expect(() => Product.create(productWith({ imageUrl: '  ' }))).toThrow(
      ValidationError,
    );
  });

  it('refuses a product with no id', () => {
    expect(() => Product.create(productWith({ id: '' }))).toThrow(
      ValidationError,
    );
  });
});
