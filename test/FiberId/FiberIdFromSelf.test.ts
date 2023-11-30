import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, test } from "vitest"

describe("FiberIdFromSelf", () => {
  test("property tests", () => {
    Util.roundtrip(S.FiberIdFromSelf)
  })
})