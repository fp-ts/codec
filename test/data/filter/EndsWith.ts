import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema"
import * as P from "@effect/schema/Parser"

describe.concurrent("endsWith", () => {
  it("Guard", () => {
    const schema = pipe(S.string, S.endsWith("a"))
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("ba")).toEqual(true)

    expect(is("")).toEqual(false)
    expect(is("b")).toEqual(false)
  })
})
