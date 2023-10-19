import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as JSONSchema from "@effect/schema/JSONSchema"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import Ajv from "ajv"
import * as fc from "fast-check"

type JsonArray = ReadonlyArray<Json>

type JsonObject = { readonly [key: string]: Json }

type Json =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject

const propertyTo = <I, A>(schema: S.Schema<I, A>) => {
  const arbitrary = A.to(schema)
  const is = S.is(schema)
  const jsonSchema = JSONSchema.to(schema)
  // console.log(JSON.stringify(jsonSchema, null, 2))
  const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
  const arb = arbitrary(fc)
  // console.log(fc.sample(arb, 10))
  fc.assert(fc.property(arb, (a) => {
    return is(a) && validate(a)
  }))
}

const propertyFrom = <I, A>(schema: S.Schema<I, A>) => {
  const arbitrary = A.from(schema)
  const is = S.is(S.from(schema))
  const validate = new Ajv({ strictTuples: false }).compile(JSONSchema.from(schema))
  const arb = arbitrary(fc)
  fc.assert(fc.property(arb, (a) => {
    return is(a) && validate(a)
  }))
}

describe("JSONSchema", () => {
  it("from", () => {
    propertyFrom(S.struct({ a: S.string, b: S.NumberFromString }))
  })

  describe("declaration", () => {
    it("should raise an error when an annotation doesn't exist", () => {
      expect(() => JSONSchema.to(S.chunk(S.JsonNumber))).toThrowError(
        new Error("cannot build a JSON Schema for Declaration")
      )
    })

    it("should return the provided JSON Schema when an annotation exists", () => {
      const schema = S.declare([], S.struct({}), () => (input) => ParseResult.success(input), {
        [AST.JSONSchemaAnnotationId]: { type: "string" },
        [A.ArbitraryHookId]: (): A.Arbitrary<string> => (fc) => fc.string()
      })
      propertyTo(schema)
    })
  })

  it("bigint should raise an error", () => {
    expect(() => JSONSchema.to(S.bigint)).toThrowError(
      new Error("cannot convert `bigint` to JSON Schema")
    )
  })

  it("symbol should raise an error", () => {
    expect(() => JSONSchema.to(S.symbol)).toThrowError(
      new Error("cannot convert `symbol` to JSON Schema")
    )
  })

  it("a unique symbol should raise an error", () => {
    expect(() => JSONSchema.to(S.uniqueSymbol(Symbol.for("@effect/schema/test/a")))).toThrowError(
      new Error("cannot convert a unique symbol to JSON Schema")
    )
  })

  it("undefined should raise an error", () => {
    expect(() => JSONSchema.to(S.undefined)).toThrowError(
      new Error("cannot convert `undefined` to JSON Schema")
    )
  })

  it("void should raise an error", () => {
    expect(() => JSONSchema.to(S.void)).toThrowError(
      new Error("cannot convert `void` to JSON Schema")
    )
  })

  it("never should raise an error", () => {
    expect(() => JSONSchema.to(S.never)).toThrowError(
      new Error("cannot convert `never` to JSON Schema")
    )
  })

  it("any", () => {
    propertyTo(S.any)
  })

  it("unknown", () => {
    propertyTo(S.unknown)
  })

  it("object", () => {
    propertyTo(S.object)
  })

  it("string", () => {
    propertyTo(S.string)
  })

  it("JsonNumber", () => {
    propertyTo(S.JsonNumber)
  })

  it("boolean", () => {
    propertyTo(S.boolean)
  })

  describe("literal", () => {
    it("null", () => {
      propertyTo(S.null)
    })

    it("string", () => {
      propertyTo(S.literal("a"))
    })

    it("number", () => {
      propertyTo(S.literal(1))
    })

    it("boolean", () => {
      propertyTo(S.literal(true))
      propertyTo(S.literal(false))
    })

    it("literals", () => {
      propertyTo(S.literal(1, "a"))
    })

    it("bigint should raise an error", () => {
      expect(() => JSONSchema.to(S.literal(1n))).toThrowError(
        new Error("cannot convert `bigint` to JSON Schema")
      )
    })
  })

  describe("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      propertyTo(S.enums(Fruits))
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      propertyTo(S.enums(Fruits))
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      propertyTo(S.enums(Fruits))
    })
  })

  it("union", () => {
    propertyTo(S.union(S.string, S.JsonNumber))
  })

  describe("tuple", () => {
    it("e? should raise an error", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.JsonNumber))
      expect(() => JSONSchema.to(schema)).toThrowError(
        new Error(
          "Generating a JSON Schema for an optional element is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("e + e? should raise an error", () => {
      const schema = S.tuple(S.string).pipe(S.optionalElement(S.JsonNumber))
      expect(() => JSONSchema.to(schema)).toThrowError(
        new Error(
          "Generating a JSON Schema for an optional element is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("e? + r should raise an error", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(S.JsonNumber))
      expect(() => JSONSchema.to(schema)).toThrowError(
        new Error(
          "Generating a JSON Schema for an optional element is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("r + e should raise an error", () => {
      const schema = S.array(S.JsonNumber).pipe(S.element(S.string))
      expect(() => JSONSchema.to(schema)).toThrowError(
        new Error(
          "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("empty", () => {
      const schema = S.tuple()
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "array",
        "maxItems": 0
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(false)
    })

    it("e", () => {
      const schema = S.tuple(S.JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "array",
        "items": [{
          "type": "number"
        }],
        "minItems": 1,
        "additionalItems": false
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, "a"])).toEqual(false)
      propertyTo(schema)
    })

    it("e + r", () => {
      const schema = S.tuple(S.string).pipe(S.rest(S.JsonNumber))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "array",
        "items": [{
          "type": "string"
        }],
        "minItems": 1,
        "additionalItems": { "type": "number" }
      })
      const validate = new Ajv({ strictTuples: false }).compile({
        "type": "array",
        "items": [
          { "type": "string" }
        ],
        "minItems": 1,
        "additionalItems": { "type": "number" }
      })
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate(["a", 1, 2])).toEqual(true)
      expect(validate(["a", 1, 2, 3])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate(["a", "b"])).toEqual(false)
      propertyTo(schema)
    })

    it("r", () => {
      const schema = S.array(S.JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "array",
        "items": { "type": "number" }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate([1, 2])).toEqual(true)
      expect(validate([1, 2, 3])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2, 3, "a"])).toEqual(false)
      propertyTo(schema)
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.struct({})
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({ "anyOf": [{ "type": "object" }, { "type": "array" }] })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ a: 1 })).toEqual(true)
      expect(validate([])).toEqual(true)
      expect(validate(null)).toEqual(false)
      expect(validate(1)).toEqual(false)
      expect(validate(true)).toEqual(false)
      propertyTo(schema)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.JsonNumber })
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          },
          "b": {
            "type": "number"
          }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ a: "a" })).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
      propertyTo(schema)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.string, b: S.optional(S.JsonNumber) })
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          },
          "b": {
            "type": "number"
          }
        },
        "required": ["a"],
        "additionalProperties": false
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
      propertyTo(schema)
    })

    it("should raise an error if there is a property named with a symbol", () => {
      const a = Symbol.for("@effect/schema/test/a")
      expect(() => JSONSchema.to(S.struct({ [a]: S.string }))).toThrowError(
        new Error("Cannot encode Symbol(@effect/schema/test/a) key to JSON Schema")
      )
    })
  })

  describe("record", () => {
    it("record(string, number)", () => {
      const schema = S.record(S.string, S.number)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": {
          "allOf": [{
            "type": "number"
          }]
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: 1, b: 2 })).toEqual(true)
      expect(validate({ a: 1, b: "b" })).toEqual(false)
      propertyTo(schema)
    })

    it("record('a' | 'b', number)", () => {
      const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({
        "type": "object",
        "properties": {
          "a": {
            "type": "number"
          },
          "b": {
            "type": "number"
          }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      })
      propertyTo(schema)
    })
  })

  it("struct + record", () => {
    const schema = S.struct({ a: S.string }).pipe(
      S.extend(S.record(S.string, S.string))
    )
    const jsonSchema = JSONSchema.to(schema)
    expect(jsonSchema).toStrictEqual({
      "type": "object",
      "required": [
        "a"
      ],
      "properties": {
        "a": {
          "type": "string"
        }
      },
      "additionalProperties": {
        "allOf": [
          {
            "type": "string"
          }
        ]
      }
    })
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({ a: "a" })).toEqual(true)
    expect(validate({ a: "a", b: "b" })).toEqual(true)
    expect(validate({})).toEqual(false)
    expect(validate({ b: "b" })).toEqual(false)
    expect(validate({ a: 1 })).toEqual(false)
    expect(validate({ a: "a", b: 1 })).toEqual(false)
    propertyTo(schema)
  })

  describe("refinement", () => {
    it("should return the JSON Schema of the from schema if there is no annotation", () => {
      const schema = S.string.pipe(S.filter(() => true))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toStrictEqual({ "type": "string" })
    })

    it("minLength", () => {
      const schema = S.string.pipe(S.minLength(1))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ type: "string", minLength: 1 })
      propertyTo(schema)
    })

    it("maxLength", () => {
      const schema = S.string.pipe(S.maxLength(1))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ type: "string", maxLength: 1 })
      propertyTo(schema)
    })

    it("greaterThan", () => {
      const schema = S.JsonNumber.pipe(S.greaterThan(1))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ type: "number", exclusiveMinimum: 1 })
      propertyTo(schema)
    })

    it("greaterThanOrEqualTo", () => {
      const schema = S.JsonNumber.pipe(S.greaterThanOrEqualTo(1))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ type: "number", minimum: 1 })
      propertyTo(schema)
    })

    it("lessThan", () => {
      const schema = S.JsonNumber.pipe(S.lessThan(1))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ type: "number", exclusiveMaximum: 1 })
      propertyTo(schema)
    })

    it("lessThanOrEqualTo", () => {
      const schema = S.JsonNumber.pipe(S.lessThanOrEqualTo(1))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ type: "number", maximum: 1 })
      propertyTo(schema)
    })

    it("pattern", () => {
      const schema = S.string.pipe(S.pattern(/^abb+$/))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ "type": "string", "pattern": "^abb+$" })
    })

    it("integer", () => {
      const schema = S.JsonNumber.pipe(S.int())
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({ "type": "integer" })
      propertyTo(schema)
    })
  })

  it("TemplateLiteral should raise an error", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    propertyTo(schema)
  })

  it("Lazy should raise an error", () => {
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
    expect(() => JSONSchema.to(schema)).toThrowError(
      new Error(
        "Generating a JSON Schema for lazy schemas is not currently supported. You're welcome to contribute by submitting a Pull Request."
      )
    )
  })

  it("Transform should raise an error", () => {
    expect(() => JSONSchema.go(S.NumberFromString.ast)).toThrowError(
      new Error("cannot build a JSON Schema for transformations")
    )
  })
})
