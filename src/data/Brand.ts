/**
 * @since 1.0.0
 */
import type * as B from "@effect/data/Brand"
import type * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const BrandId = "@fp-ts/schema/data/Brand/BrandId"

/**
 * @since 1.0.0
 */
export const brand = <C extends B.Brand<string>>(
  constructor: B.Brand.Constructor<C>,
  annotationOptions?: S.AnnotationOptions<B.Brand.Unbranded<C>>
) =>
  <A extends B.Brand.Unbranded<C>>(self: S.Schema<A>): S.Schema<A & C> =>
    pipe(
      self,
      I.filter<A, A & C>(
        (x): x is A & C => constructor.refine(x),
        {
          id: BrandId,
          message: (a) =>
            (constructor.either(a) as E.Left<B.Brand.BrandErrors>).left.map((v) => v.message)
              .join(", "),
          ...(annotationOptions ?? {})
        }
      )
    )
