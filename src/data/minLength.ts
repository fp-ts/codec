/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { JsonEncoder } from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/minLength")

/**
 * @since 1.0.0
 */
export const guard = (minLength: number) =>
  <A extends { length: number }>(self: Guard<A>): Guard<A> =>
    I.makeGuard(schema(minLength)(self), (u): u is A => self.is(u) && u.length >= minLength)

/**
 * @since 1.0.0
 */
export const unknownDecoder = (minLength: number) =>
  <I, A extends { length: number }>(self: Decoder<I, A>): Decoder<I, A> =>
    I.makeDecoder(
      schema(minLength)(self),
      (i) =>
        pipe(
          self.decode(i),
          I.flatMap((a) =>
            a.length >= minLength ? I.success(a) : I.failure(DE.minLength(minLength, a))
          )
        )
    )

/**
 * @since 1.0.0
 */
export const jsonEncoder = (minLength: number) =>
  <A extends { length: number }>(self: JsonEncoder<A>): JsonEncoder<A> =>
    I.makeEncoder(schema(minLength)(self), self.encode)

/**
 * @since 1.0.0
 */
export const arbitrary = (minLength: number) =>
  <A extends { length: number }>(self: Arbitrary<A>): Arbitrary<A> =>
    I.makeArbitrary(
      schema(minLength)(self),
      (fc) => self.arbitrary(fc).filter((a) => a.length >= minLength)
    )

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.UnknownDecoderId]: unknownDecoder,
  [I.JsonDecoderId]: unknownDecoder,
  [I.UnknownEncoderId]: jsonEncoder,
  [I.JsonEncoderId]: jsonEncoder
})

/**
 * @since 1.0.0
 */
export const schema = (minLength: number) =>
  <A extends { length: number }>(self: Schema<A>): Schema<A> =>
    I.declareSchema(id, O.some(minLength), Provider, self)
