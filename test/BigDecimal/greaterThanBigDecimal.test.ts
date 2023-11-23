import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("bigint/greaterThanBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanBigDecimal(min))

  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      "0",
      "Expected a BigDecimal greater than 10, actual {\"_id\":\"BigDecimal\",\"value\":\"0\",\"scale\":0}"
    )
    await Util.expectParseFailure(
      schema,
      "10",
      "Expected a BigDecimal greater than 10, actual {\"_id\":\"BigDecimal\",\"value\":\"1\",\"scale\":-1}"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(11), "11")
  })
})