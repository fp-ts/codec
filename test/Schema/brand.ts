import * as Either from "@effect/data/Either"
import * as Option from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Schema/brand", () => {
  describe.concurrent("annotations", () => {
    it("should move the brand annotations to the right end", async () => {
      const codec = Util.X2.pipe(S.brand("X2"))
      expect(S.to(codec).ast).toEqual(S.string.pipe(S.brand("X2")).ast)
    })

    it("brand as string", () => {
      // const Branded: S.Schema<number, number & Brand<"A"> & Brand<"B">>
      const Branded = S.number.pipe(
        S.int(),
        S.brand("A"),
        S.brand("B", {
          description: "a B brand"
        })
      )

      expect(Branded.ast.annotations).toEqual({
        [AST.TypeAnnotationId]: S.IntTypeId,
        [AST.BrandAnnotationId]: ["A", "B"],
        [AST.DescriptionAnnotationId]: "a B brand",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })

    it("brand as symbol", () => {
      const A = Symbol.for("A")
      const B = Symbol.for("B")
      // const Branded: S.Schema<number, number & Brand<unique symbol> & Brand<unique symbol>>
      const Branded = S.number.pipe(
        S.int(),
        S.brand(A),
        S.brand(B, {
          description: "a B brand"
        })
      )
      expect(Branded.ast.annotations).toEqual({
        [AST.TypeAnnotationId]: S.IntTypeId,
        [AST.BrandAnnotationId]: [A, B],
        [AST.DescriptionAnnotationId]: "a B brand",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })
  })

  it("the constructor should throw on invalid values", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int(1)).toEqual(1)
    expect(() => Int(1.2)).toThrowError(
      new Error(`error(s) found
└─ Expected integer, actual 1.2`)
    )
  })

  it("option", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.option(1)).toEqual(Option.some(1))
    expect(Int.option(1.2)).toEqual(Option.none())
  })

  it("either", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.either(1)).toEqual(Either.right(1))
    expect(Int.either(1.2)).toEqual(Either.left([{
      meta: 1.2,
      message: `error(s) found
└─ Expected integer, actual 1.2`
    }]))
  })

  it("refine", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.refine(1)).toEqual(true)
    expect(Int.refine(1.2)).toEqual(false)
  })

  it("composition", () => {
    const int = <I, A extends number>(self: S.Schema<I, A>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <I, A extends number>(self: S.Schema<I, A>) =>
      self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.string.pipe(S.numberFromString, int, positive)

    expect(PositiveInt.refine(1)).toEqual(true)
    expect(PositiveInt.refine(-1)).toEqual(false)
    expect(PositiveInt.refine(1.2)).toEqual(false)
  })

  describe.concurrent("decoding", () => {
    it("string brand", async () => {
      const schema = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
      await Util.expectParseSuccess(schema, "1", 1 as any)
      await Util.expectParseFailure(
        schema,
        null,
        `Expected string, actual null`
      )
    })

    it("symbol brand", async () => {
      const Int = Symbol.for("Int")
      const schema = S.string.pipe(S.numberFromString, S.int(), S.brand(Int))
      await Util.expectParseSuccess(schema, "1", 1 as any)
      await Util.expectParseFailure(
        schema,
        null,
        `Expected string, actual null`
      )
    })
  })
})
