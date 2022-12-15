import * as O from "@fp-ts/data/Option"
import * as _ from "@fp-ts/schema/AST"
import * as DataChunk from "@fp-ts/schema/data/Chunk"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as S from "@fp-ts/schema/Schema"

describe("AST", () => {
  describe("struct", () => {
    describe("should give precedence to fields / index signatures containing less inhabitants", () => {
      it("literal vs string", () => {
        const schema = S.struct({ a: S.string, b: S.literal("b") })
        expect(schema.ast).toEqual({
          _tag: "Struct",
          fields: [
            _.field("b", _.literalType("b"), true),
            _.field("a", _.stringKeyword, true)
          ],
          indexSignatures: []
        })
      })

      it("undefined vs string", () => {
        const schema = S.struct({ a: S.string, b: S.undefined })
        expect(schema.ast).toEqual({
          _tag: "Struct",
          fields: [
            _.field("b", _.undefinedKeyword, true),
            _.field("a", _.stringKeyword, true)
          ],
          indexSignatures: []
        })
      })

      it("boolean vs string", () => {
        const schema = S.struct({ a: S.string, b: S.boolean })
        expect(schema.ast).toEqual({
          _tag: "Struct",
          fields: [
            _.field("b", _.booleanKeyword, true),
            _.field("a", _.stringKeyword, true)
          ],
          indexSignatures: []
        })
      })

      it("literal vs boolean", () => {
        const schema = S.struct({ a: S.boolean, b: S.literal(null) })
        expect(schema.ast).toEqual({
          _tag: "Struct",
          fields: [
            _.field("b", _.literalType(null), true),
            _.field("a", _.booleanKeyword, true)
          ],
          indexSignatures: []
        })
      })
    })
  })

  describe("union", () => {
    describe("should give precedence to schemas containing more infos", () => {
      it("1 required vs 2 required", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        expect(schema.ast).toEqual({
          _tag: "Union",
          members: [ab.ast, a.ast]
        })
      })

      it("1 required vs 2 optional", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.optional(S.string), b: S.optional(S.number) })
        const schema = S.union(a, ab)
        expect(schema.ast).toEqual({
          _tag: "Union",
          members: [ab.ast, a.ast]
        })
      })
    })

    describe("should remove duplicated ASTs", () => {
      it("plain", () => {
        const a = S.literal("a")
        const schema = S.union(a, a)
        expect(schema.ast).toEqual(a.ast)
      })

      it("nested", () => {
        const a = S.literal("a")
        const b = S.literal("b")
        const schema = S.union(a, b, S.union(a, b))
        expect(schema.ast).toEqual(S.union(a, b).ast)
      })
    })
  })

  describe("keyof", () => {
    it("TypeAliasDeclaration", () => {
      // type Test = keyof Chunk<number> // id
      expect(_.keyof(DataChunk.schema(S.number).ast)).toEqual(["_id"])
    })

    it("TypeAliasDeclaration", () => {
      // type Test = keyof O.Option<number> // "_tag"
      expect(_.keyof(DataOption.schema(S.number).ast)).toEqual(["_tag"])
    })

    it("tuple", () => {
      // type Test = keyof [] // never
      expect(_.keyof(S.tuple().ast)).toEqual([])
      // type Test = keyof [string, number] // '0' | '1'
      expect(_.keyof(S.tuple(S.string, S.number).ast)).toEqual(["0", "1"])
    })

    it("struct", () => {
      // type Test = keyof {} // never
      expect(_.keyof(S.struct({}).ast)).toEqual([])
      // type Test = keyof { a: string, b: number } // 'a' | 'b'
      expect(_.keyof(S.struct({ a: S.string, b: S.number }).ast)).toEqual(["a", "b"])

      const a = Symbol.for("@fp-ts/schema/test/a")
      // type Test = keyof { [a]: string } // typeof A
      expect(_.keyof(S.struct({ [a]: S.string }).ast)).toEqual([a])
    })

    describe("union", () => {
      it("empty union", () => {
        const schema = S.union()
        expect(_.keyof(schema.ast)).toEqual(_.keyof(_.neverKeyword))
      })

      it("discriminated unions", () => {
        const schema = S.union(
          S.struct({ _tag: S.literal("A"), a: S.string }),
          S.struct({ _tag: S.literal("B"), b: S.number })
        )
        expect(_.keyof(schema.ast)).toEqual(["_tag"])
      })
    })

    it("lazy", () => {
      // type Test = keyof A // 'a' | 'as'
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
      expect(_.keyof(schema.ast)).toEqual(["a", "as"])
    })
  })

  describe("getFields", () => {
    it("type alias", () => {
      const schema = DataOption.schema(S.number)
      expect(_.getFields(schema.ast)).toEqual([
        _.field("_tag", S.union(S.literal("Some"), S.literal("None")).ast, true)
      ])
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      expect(_.getFields(schema.ast)).toEqual([
        _.field(0, S.string.ast, true),
        _.field(1, S.number.ast, true)
      ])
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      expect(_.getFields(schema.ast)).toEqual([
        _.field("a", S.string.ast, true),
        _.field("b", S.number.ast, true)
      ])
    })

    describe("union", () => {
      it("required fields", () => {
        const schema = S.union(
          S.struct({ a: S.string, b: S.number }),
          S.struct({ a: S.boolean, c: S.boolean })
        )
        expect(_.getFields(schema.ast)).toEqual([
          _.field("a", _.union([S.string.ast, S.boolean.ast]), true)
        ])
      })

      it("optional fields", () => {
        const schema = S.union(
          S.struct({ a: S.string, b: S.number }),
          S.struct({ c: S.boolean, a: S.optional(S.boolean) })
        )
        expect(_.getFields(schema.ast)).toEqual([
          _.field("a", _.optionalType(_.union([S.string.ast, S.boolean.ast])), true)
        ])
      })
    })

    it("lazy", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const Category: S.Schema<Category> = S.lazy<Category>(
        () =>
          S.struct({
            name: S.string,
            categories: S.array(Category)
          })
      )
      expect(_.getFields(Category.ast)).toEqual([
        _.field("name", S.string.ast, true),
        _.field("categories", _.tuple([], O.some(Category.ast), true), true)
      ])
    })
  })
})
