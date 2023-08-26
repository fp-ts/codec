import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("bigint/clampBigint", () => {
  it("decoding", async () => {
    const schema = S.bigint.pipe(S.clampBigint(-1n, 1n))

    await Util.expectParseSuccess(schema, 3n, 1n)
    await Util.expectParseSuccess(schema, 0n, 0n)
    await Util.expectParseSuccess(schema, -3n, -1n)
  })
})
