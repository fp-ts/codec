/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import * as AST from "./AST.js"
import * as Parser from "./Parser.js"
import * as Schema from "./Schema.js"

interface JsonSchema7Any {
  $id: "/schemas/any"
}

interface JsonSchema7Unknown {
  $id: "/schemas/unknown"
}

interface JsonSchema7object {
  $id: "/schemas/object"
  oneOf: [
    { type: "object" },
    { type: "array" }
  ]
}

interface JsonSchema7empty {
  $id: "/schemas/{}"
  oneOf: [
    { type: "object" },
    { type: "array" }
  ]
}

interface JsonSchema7Ref {
  $ref: string
}

interface JsonSchema7Const {
  const: AST.LiteralValue
}

interface JsonSchema7String {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: string
  description?: string
}

interface JsonSchema7Numeric {
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

interface JsonSchema7Number extends JsonSchema7Numeric {
  type: "number"
}

interface JsonSchema7Integer extends JsonSchema7Numeric {
  type: "integer"
}

interface JsonSchema7Boolean {
  type: "boolean"
}

interface JsonSchema7Array {
  type: "array"
  items?: JsonSchema7 | Array<JsonSchema7>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema7 | boolean
}

interface JsonSchema7OneOf {
  oneOf: Array<JsonSchema7>
}

interface JsonSchema7Enums {
  $comment: "/schemas/enums"
  oneOf: Array<{
    title: string
    const: string | number
  }>
}

interface JsonSchema7AnyOf {
  anyOf: Array<JsonSchema7>
}

interface JsonSchema7Object {
  type: "object"
  required: Array<string>
  properties: Record<string, JsonSchema7>
  additionalProperties?: boolean | JsonSchema7
  patternProperties?: Record<string, JsonSchema7>
}

type JsonSchema7 =
  | JsonSchema7Any
  | JsonSchema7Unknown
  | JsonSchema7object
  | JsonSchema7empty
  | JsonSchema7Ref
  | JsonSchema7Const
  | JsonSchema7String
  | JsonSchema7Number
  | JsonSchema7Integer
  | JsonSchema7Boolean
  | JsonSchema7Array
  | JsonSchema7OneOf
  | JsonSchema7Enums
  | JsonSchema7AnyOf
  | JsonSchema7Object

type JsonSchema7Top = JsonSchema7 & {
  $schema?: string
  $defs?: Record<string, JsonSchema7>
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Top => goTop(AST.to(schema.ast))

/**
 * @category encoding
 * @since 1.0.0
 */
export const from = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Top =>
  goTop(AST.from(schema.ast))

const anyJsonSchema: JsonSchema7 = { $id: "/schemas/any" }

const unknownJsonSchema: JsonSchema7 = { $id: "/schemas/unknown" }

const objectJsonSchema: JsonSchema7 = {
  "$id": "/schemas/object",
  "oneOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const emptyJsonSchema: JsonSchema7 = {
  "$id": "/schemas/{}",
  "oneOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const $schema = "http://json-schema.org/draft-07/schema#"

/** @internal */
export const goTop = (ast: AST.AST): JsonSchema7Top => {
  const $defs = {}
  const jsonSchema = goWithMetaData(ast, $defs)
  const out: JsonSchema7Top = {
    $schema,
    ...jsonSchema
  }
  if (!ReadonlyRecord.isEmptyRecord($defs)) {
    out.$defs = $defs
  }
  return out
}

const goWithIdentifier = (ast: AST.AST, $defs: Record<string, JsonSchema7>): JsonSchema7 => {
  const identifier = AST.getIdentifierAnnotation(ast)
  return Option.match(identifier, {
    onNone: () => goWithMetaData(ast, $defs),
    onSome: (id) => {
      if (!ReadonlyRecord.has($defs, id)) {
        const jsonSchema = goWithMetaData(ast, $defs)
        if (!ReadonlyRecord.has($defs, id)) {
          $defs[id] = jsonSchema
        }
      }
      return { $ref: `#/$defs/${id}` }
    }
  })
}

const getMetaData = (annotated: AST.Annotated) => {
  return ReadonlyRecord.compact<unknown>({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    examples: AST.getExamplesAnnotation(annotated),
    default: AST.getDefaultAnnotation(annotated)
  })
}

const goWithMetaData = (ast: AST.AST, $defs: Record<string, JsonSchema7>): JsonSchema7 => {
  const jsonSchema = go(ast, $defs)
  return {
    ...jsonSchema,
    ...getMetaData(ast)
  }
}

const DEFINITION_PREFIX = "#/$defs/"

const go = (ast: AST.AST, $defs: Record<string, JsonSchema7>): JsonSchema7 => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = AST.getJSONSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return annotation.value as any
      }
      throw new Error(
        "cannot build a JSON Schema for declarations without a JSON Schema annotation"
      )
    }
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        return { const: null }
      } else if (Predicate.isString(literal)) {
        return { const: literal }
      } else if (Predicate.isNumber(literal)) {
        return { const: literal }
      } else if (Predicate.isBoolean(literal)) {
        return { const: literal }
      }
      throw new Error("cannot convert `bigint` to JSON Schema")
    }
    case "UniqueSymbol":
      throw new Error("cannot convert a unique symbol to JSON Schema")
    case "UndefinedKeyword":
      throw new Error("cannot convert `undefined` to JSON Schema")
    case "VoidKeyword":
      throw new Error("cannot convert `void` to JSON Schema")
    case "NeverKeyword":
      throw new Error("cannot convert `never` to JSON Schema")
    case "UnknownKeyword":
      return { ...unknownJsonSchema }
    case "AnyKeyword":
      return { ...anyJsonSchema }
    case "ObjectKeyword":
      return { ...objectJsonSchema }
    case "StringKeyword":
      return { type: "string" }
    case "NumberKeyword":
      return { type: "number" }
    case "BooleanKeyword":
      return { type: "boolean" }
    case "BigIntKeyword":
      throw new Error("cannot convert `bigint` to JSON Schema")
    case "SymbolKeyword":
      throw new Error("cannot convert `symbol` to JSON Schema")
    case "Tuple": {
      const elements = ast.elements.map((e) => goWithIdentifier(e.type, $defs))
      const rest = Option.map(
        ast.rest,
        ReadonlyArray.map((ast) => goWithIdentifier(ast, $defs))
      )
      const output: JsonSchema7Array = { type: "array" }
      // ---------------------------------------------
      // handle elements
      // ---------------------------------------------
      const len = elements.length
      if (len > 0) {
        output.minItems = len - ast.elements.filter((element) => element.isOptional).length
        output.items = elements
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (Option.isSome(rest)) {
        const head = rest.value[0]
        if (len > 0) {
          output.additionalItems = head
        } else {
          output.items = head
        }

        // ---------------------------------------------
        // handle post rest elements
        // ---------------------------------------------
        if (rest.value.length > 1) {
          throw new Error(
            "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
          )
        }
      } else {
        if (len > 0) {
          output.additionalItems = false
        } else {
          output.maxItems = 0
        }
      }

      return output
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return { ...emptyJsonSchema }
      }
      let additionalProperties: JsonSchema7 | undefined = undefined
      let patternProperties: Record<string, JsonSchema7> | undefined = undefined
      for (const is of ast.indexSignatures) {
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword": {
            additionalProperties = goWithIdentifier(is.type, $defs)
            break
          }
          case "TemplateLiteral": {
            patternProperties = {
              [Parser.getTemplateLiteralRegex(parameter).source]: goWithIdentifier(
                is.type,
                $defs
              )
            }
            break
          }
          case "Refinement": {
            const annotation = AST.getJSONSchemaAnnotation(parameter)
            if (
              Option.isSome(annotation) && "pattern" in annotation.value &&
              Predicate.isString(annotation.value.pattern)
            ) {
              patternProperties = {
                [annotation.value.pattern]: goWithIdentifier(
                  is.type,
                  $defs
                )
              }
              break
            }
            throw new Error(`Unsupported index signature parameter ${parameter._tag}`)
          }
          case "SymbolKeyword":
            throw new Error(`Unsupported index signature parameter ${parameter._tag}`)
        }
      }
      const propertySignatures = ast.propertySignatures.map((ps) => {
        return { ...goWithIdentifier(ps.type, $defs), ...getMetaData(ps) }
      })
      const output: JsonSchema7Object = {
        type: "object",
        required: [],
        properties: {},
        additionalProperties: false
      }
      // ---------------------------------------------
      // handle property signatures
      // ---------------------------------------------
      for (let i = 0; i < propertySignatures.length; i++) {
        const name = ast.propertySignatures[i].name
        if (typeof name === "string") {
          output.properties[name] = propertySignatures[i]
          // ---------------------------------------------
          // handle optional property signatures
          // ---------------------------------------------
          if (!ast.propertySignatures[i].isOptional) {
            output.required.push(name)
          }
        } else {
          throw new Error(`Cannot encode ${String(name)} key to JSON Schema`)
        }
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (additionalProperties !== undefined) {
        output.additionalProperties = additionalProperties
      }
      if (patternProperties !== undefined) {
        output.patternProperties = patternProperties
      }

      return output
    }
    case "Union":
      return { anyOf: ast.types.map((ast) => goWithIdentifier(ast, $defs)) }
    case "Enums": {
      return {
        $comment: "/schemas/enums",
        oneOf: ast.enums.map((e) => ({ title: e[0], const: e[1] }))
      }
    }
    case "Refinement": {
      const from = goWithIdentifier(ast.from, $defs)
      const annotation = AST.getJSONSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return { ...from, ...annotation.value }
      }
      throw new Error(
        "cannot build a JSON Schema for refinements without a JSON Schema annotation"
      )
    }
    case "TemplateLiteral": {
      const regex = Parser.getTemplateLiteralRegex(ast)
      return {
        type: "string",
        description: "a template literal",
        pattern: regex.source
      }
    }
    case "Lazy": {
      const identifier = AST.getIdentifierAnnotation(ast)
      if (Option.isNone(identifier)) {
        throw new Error(
          "Generating a JSON Schema for lazy schemas requires an identifier annotation"
        )
      }
      const id = identifier.value
      if (!ReadonlyRecord.has($defs, id)) {
        $defs[id] = anyJsonSchema
        const jsonSchema = goWithIdentifier(ast.f(), $defs)
        $defs[id] = jsonSchema
      }
      return { $ref: `${DEFINITION_PREFIX}${id}` }
    }
    case "Transform":
      throw new Error("cannot build a JSON Schema for transformations")
  }
}

/** @internal */
export const decode = <A>(schema: JsonSchema7Top): Schema.Schema<A> =>
  Schema.make(decodeAST(schema, schema.$defs))

const emptyTypeLiteralAST = AST.createTypeLiteral([], [])

const decodeAST = (schema: JsonSchema7, $defs: JsonSchema7Top["$defs"]): AST.AST => {
  if ("$id" in schema) {
    switch (schema.$id) {
      case "/schemas/any":
        return AST.anyKeyword
      case "/schemas/unknown":
        return AST.unknownKeyword
      case "/schemas/object":
        return AST.objectKeyword
      case "/schemas/{}":
        return emptyTypeLiteralAST
    }
  } else if ("const" in schema) {
    return AST.createLiteral(schema.const)
  } else if ("type" in schema) {
    const type = schema.type
    if (type === "string") {
      return AST.stringKeyword
    } else if (type === "number") {
      return AST.numberKeyword
    } else if (type === "integer") {
      return AST.numberKeyword
    } else if (type === "boolean") {
      return AST.booleanKeyword
    } else if (type === "array") {
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          const minItems = schema.minItems ?? -1
          const rest: AST.Tuple["rest"] =
            schema.additionalItems && !Predicate.isBoolean(schema.additionalItems)
              ? Option.some([decodeAST(schema.additionalItems, $defs)])
              : Option.none()
          return AST.createTuple(
            schema.items.map((item, i) => AST.createElement(decodeAST(item, $defs), i >= minItems)),
            rest,
            true
          )
        } else {
          return AST.createTuple([], Option.some([decodeAST(schema.items, $defs)]), true)
        }
      } else {
        return AST.createTuple([], Option.none(), true)
      }
    } else if (type === "object") {
      const required = schema.required || []
      const propertySignatures: Array<AST.PropertySignature> = []
      const indexSignatures: Array<AST.IndexSignature> = []
      for (const name in schema.properties) {
        propertySignatures.push(
          AST.createPropertySignature(
            name,
            decodeAST(schema.properties[name], $defs),
            !required.includes(name),
            true
          )
        )
      }
      if (schema.additionalProperties && !Predicate.isBoolean(schema.additionalProperties)) {
        indexSignatures.push(
          AST.createIndexSignature(
            AST.stringKeyword,
            decodeAST(schema.additionalProperties, $defs),
            true
          )
        )
      }
      if (schema.patternProperties) {
        for (const pattern in schema.patternProperties) {
          indexSignatures.push(
            AST.createIndexSignature(
              Schema.string.pipe(Schema.pattern(new RegExp(pattern))).ast,
              decodeAST(schema.patternProperties[pattern], $defs),
              true
            )
          )
        }
      }
      return AST.createTypeLiteral(propertySignatures, indexSignatures)
    }
  } else if ("anyOf" in schema) {
    return AST.createUnion(schema.anyOf.map((s) => decodeAST(s, $defs)))
  } else if ("oneOf" in schema) {
    if ("$comment" in schema && schema.$comment === "/schemas/enums") {
      return AST.createEnums(schema.oneOf.map((e) => [e.title, e.const]))
    }
    return AST.createUnion(schema.oneOf.map((s) => decodeAST(s, $defs)))
  } else if ("$ref" in schema) {
    if ($defs) {
      const id = schema.$ref.substring(DEFINITION_PREFIX.length)
      if (id in $defs) {
        return decodeAST($defs[id], $defs)
      }
    }
    throw new Error(`cannot find $ref: ${schema.$ref}`)
  }
  throw new Error(`cannot decode: ${JSON.stringify(schema, null, 2)}`)
}
