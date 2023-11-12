import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/rename", () => {
  it("string key", async () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const renamed = S.rename(schema, { a: "c" })

    await Util.expectParseSuccess(renamed, { a: "a", b: 1 }, { c: "a", b: 1 })
    await Util.expectEncodeSuccess(renamed, { c: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("symbol key", async () => {
    const c = Symbol.for("@effect/schema/test/c")
    const schema = S.struct({ a: S.string, b: S.number })
    const renamed = S.rename(schema, { a: c })

    await Util.expectParseSuccess(renamed, { a: "a", b: 1 }, { [c]: "a", b: 1 })
    await Util.expectEncodeSuccess(renamed, { [c]: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("double renaming", async () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const renamed = S.rename(schema, { a: "c" })
    const renamed2 = S.rename(renamed, { c: "d" })

    await Util.expectParseSuccess(renamed2, { a: "a", b: 1 }, { d: "a", b: 1 })
    await Util.expectEncodeSuccess(renamed2, { d: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("lazy", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: S.array(schema)
      })
    )
    const renamed = S.rename(schema, { a: "c" })

    await Util.expectParseSuccess(renamed, { a: "a1", as: [{ a: "a2", as: [] }] }, {
      c: "a1",
      as: [{ a: "a2", as: [] }]
    })
    await Util.expectEncodeSuccess(renamed, {
      c: "a1",
      as: [{ a: "a2", as: [] }]
    }, { a: "a1", as: [{ a: "a2", as: [] }] })
  })
})
