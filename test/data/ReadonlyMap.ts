import * as S from "@effect/schema"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.numberFromString(S.string)

describe.concurrent("ReadonlyMap", () => {
  it("readonlyMapGuard. keyof", () => {
    expect(S.keyof(S.readonlyMapGuard(S.number, S.string))).toEqual(S.literal("size"))
  })

  it("readonlyMapGuard. property tests", () => {
    Util.property(S.readonlyMapGuard(S.number, S.string))
  })

  it("readonlyMapGuard. decoder", () => {
    const schema = S.readonlyMapGuard(NumberFromString, S.string)
    Util.expectDecodingSuccess(schema, new Map(), new Map())
    Util.expectDecodingSuccess(
      schema,
      new Map([["1", "a"], ["2", "b"], ["3", "c"]]),
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected ReadonlyMap, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      new Map([["1", "a"], ["a", "b"]]),
      `/1 /0 Expected a parsable value from string to number, actual "a"`
    )
  })

  it("readonlyMapGuard. encoder", () => {
    const schema = S.readonlyMapGuard(NumberFromString, S.string)
    Util.expectEncodingSuccess(schema, new Map(), new Map())
    Util.expectEncodingSuccess(
      schema,
      new Map([[1, "a"], [2, "b"], [3, "c"]]),
      new Map([["1", "a"], ["2", "b"], ["3", "c"]])
    )
  })

  it("readonlyMapGuard. guard", () => {
    const schema = S.readonlyMapGuard(S.number, S.string)
    const is = P.is(schema)
    expect(is(new Map())).toEqual(true)
    expect(is(new Map([[1, "a"], [2, "b"], [3, "c"]]))).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
    expect(is(new Map<number, string | number>([[1, "a"], [2, 1]]))).toEqual(false)
    expect(is(new Map<number, string | number>([[1, 1], [2, "b"]]))).toEqual(false)
    expect(is(new Map([[1, 1], [2, 2]]))).toEqual(false)
    expect(is(new Map<string | number, number>([["a", 1], ["b", 2], [3, 1]]))).toEqual(false)
    expect(is(new Map<number, string | number>([[1, "a"], [2, "b"], [3, 1]]))).toEqual(false)
  })

  it("readonlyMapGuard. pretty", () => {
    const schema = S.readonlyMapGuard(S.number, S.string)
    const pretty = Pretty.pretty(schema)
    expect(pretty(new Map())).toEqual("new Map([])")
    expect(pretty(new Map([[1, "a"], [2, "b"]]))).toEqual(
      `new Map([[1, "a"], [2, "b"]])`
    )
  })

  it("readonlyMap. property tests", () => {
    Util.property(S.readonlyMap(S.number, S.string))
  })

  it("readonlyMap. decoder", () => {
    const schema = S.readonlyMap(S.number, S.string)
    Util.expectDecodingSuccess(schema, [], new Map())
    Util.expectDecodingSuccess(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      [[1, "a"], [2, 1]],
      `/1 /1 Expected string, actual 1`
    )
  })

  it("readonlyMap. encoder", () => {
    const schema = S.readonlyMap(S.number, S.string)
    Util.expectEncodingSuccess(schema, new Map(), [])
    Util.expectEncodingSuccess(schema, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
