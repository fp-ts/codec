import * as S from "@effect/schema"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as Util from "@effect/schema/test/util"

describe.concurrent("lessThanOrEqualTo", () => {
  it("property tests", () => {
    Util.property(S.lessThanOrEqualTo(0)(S.number))
  })

  it("Guard", () => {
    const is = P.is(S.lessThanOrEqualTo(0)(S.number))
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("Decoder", () => {
    const schema = S.lessThanOrEqualTo(0)(S.number)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, -1)
    Util.expectDecodingFailure(
      schema,
      1,
      `Expected a number less than or equal to 0, actual 1`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(S.lessThanOrEqualTo(0)(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
