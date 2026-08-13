import { SkuSchema, text } from '@dukkanify/contracts';
import { ensure, parseOrThrow } from '../invariants';
import type { Money } from '../value-objects/money.vo';

const NameSchema = text(80);
const DescriptionSchema = text(400);

export interface ProductProps {
  id: string;
  /** Null when the product's category was deleted — `onDelete: SetNull` in §6. */
  categoryId: string | null;
  name: string;
  description: string;
  price: Money;
  sku: string;
  imageUrl: string | null;
}

/**
 * Something a store sells.
 *
 * The price is a `Money`, so the only way to hold a product is to have already decided what
 * currency it is in — there is no constructor that accepts a bare number.
 */
export class Product {
  private constructor(
    readonly id: string,
    readonly categoryId: string | null,
    readonly name: string,
    readonly description: string,
    readonly price: Money,
    readonly sku: string,
    readonly imageUrl: string | null,
  ) {}

  static create(props: ProductProps): Product {
    ensure(props.id.length > 0, 'A product needs an id.');
    ensure(
      props.price.isPositive,
      `Product "${props.name}" must cost more than nothing.`,
    );
    // Null means "no image, render the placeholder". An empty string means a broken one.
    ensure(
      props.imageUrl === null || props.imageUrl.trim().length > 0,
      `Product "${props.name}" has a blank image URL; use null when there is no image.`,
    );

    return new Product(
      props.id,
      props.categoryId,
      parseOrThrow(NameSchema, props.name, 'name'),
      parseOrThrow(DescriptionSchema, props.description, 'description'),
      props.price,
      parseOrThrow(SkuSchema, props.sku, 'sku'),
      props.imageUrl,
    );
  }
}
