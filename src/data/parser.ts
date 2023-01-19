/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as D from "@fp-ts/schema/data/Date"
import * as F from "@fp-ts/schema/data/filter"
import * as I from "@fp-ts/schema/internal/common"
import * as PE from "@fp-ts/schema/ParseError"
import type { Schema } from "@fp-ts/schema/Schema"

/**
  Transforms a `string` schema into a `number` schema by parsing the string value as a number.
  If the string is not a valid number representation, the decoding will fail with a `DecodeError.transform` error.
  The following special string values are supported: "NaN", "Infinity", "-Infinity".

  @param self - The `string` schema to transform.

  @since 1.0.0
*/
export const parseNumber = (self: Schema<string>): Schema<number> => {
  const schema: Schema<number> = pipe(
    self,
    I.transformOrFail(
      I.number,
      function decode(s: string) {
        if (s === "NaN") {
          return PE.success(NaN)
        }
        if (s === "Infinity") {
          return PE.success(Infinity)
        }
        if (s === "-Infinity") {
          return PE.success(-Infinity)
        }
        const n = parseFloat(s)
        return isNaN(n) ? PE.failure(PE.type(schema.ast, s)) : PE.success(n)
      },
      function mapFrom(n) {
        return PE.success(String(n))
      }
    )
  )
  return schema
}

/**
 * Transforms a `string` schema into a `string` schema with no leading or trailing whitespace.
 *
 * @param self - The `string` schema to transform.
 * @since 1.0.0
 */
export const trim = (self: Schema<string>): Schema<string> =>
  pipe(
    self,
    I.transform(
      pipe(self, F.trimmed()),
      (s) => s.trim(),
      (s) => s.trim()
    )
  )

/**
  Transforms a `string` schema into a `Date` schema by parsing the string using `new Date(_)`.

  @param self - The `string` schema to transform.

  @since 1.0.0
*/
export const parseDate = (self: Schema<string>): Schema<Date> => {
  const schema: Schema<Date> = pipe(
    self,
    I.transformOrFail(
      D.date,
      function decode(s: string) {
        const d = new Date(s)
        return isNaN(d as any)
          ? PE.failure(PE.type(schema.ast, s))
          : PE.success(d)
      },
      function mapFrom(n) {
        return PE.success(n.toISOString())
      }
    )
  )
  return schema
}
