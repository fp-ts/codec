/**
 * @since 1.0.0
 */

import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import type { Option } from "@effect/data/Option"
import * as O from "@effect/data/Option"
import * as P from "@effect/data/Predicate"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as RA from "@effect/data/ReadonlyArray"
import { untraced, untracedMethod } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import * as I from "@effect/schema/internal/common"
import type { ParseResult } from "@effect/schema/ParseResult"
import * as PR from "@effect/schema/ParseResult"
import type { Schema, To } from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"

const get = (ast: AST.AST) => {
  const parser = go(ast)
  return (input: unknown, options?: ParseOptions) => {
    const result = parser(input, options)
    const resultComputed = PR.eitherSync(result)
    if (E.isLeft(resultComputed)) {
      throw new Error(formatErrors(resultComputed.left))
    }
    return resultComputed.right
  }
}

const getOption = (ast: AST.AST) => {
  const parser = go(ast)
  return (input: unknown, options?: ParseOptions) =>
    O.fromEither(PR.eitherSync(parser(input, options)))
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const parse = <_, A>(schema: Schema<_, A>): (i: unknown, options?: ParseOptions) => A =>
  get(schema.ast)

/**
 * @category decoding
 * @since 1.0.0
 */
export const parseOption = <_, A>(
  schema: Schema<_, A>
): (i: unknown, options?: ParseOptions) => Option<A> => getOption(schema.ast)

/**
 * @category decoding
 * @since 1.0.0
 */
export const parseEither = <_, A>(
  schema: Schema<_, A>
) => {
  const parser = go(schema.ast)
  return (i: unknown, options?: ParseOptions): E.Either<NonEmptyReadonlyArray<PR.ParseError>, A> =>
    PR.eitherSync(parser(i, options))
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const parseEffect = <_, A>(
  schema: Schema<_, A>
): (i: unknown, options?: ParseOptions) => PR.ParseResult<A> => go(schema.ast)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode: <I, A>(schema: Schema<I, A>) => (i: I, options?: ParseOptions) => A = parse

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeOption: <I, A>(
  schema: Schema<I, A>
) => (i: I, options?: ParseOptions) => Option<A> = parseOption

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEither: <I, A>(
  schema: Schema<I, A>
) => (i: I, options?: ParseOptions) => E.Either<NonEmptyReadonlyArray<PR.ParseError>, A> =
  parseEither

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEffect: <_, A>(
  schema: Schema<_, A>
) => (i: unknown, options?: ParseOptions | undefined) => ParseResult<A> = parseEffect

/**
 * @category validation
 * @since 1.0.0
 */
export const validate = <_, A>(
  schema: Schema<_, A>
): (a: unknown, options?: ParseOptions) => A => get(AST.getTo(schema.ast))

/**
 * @category validation
 * @since 1.0.0
 */
export const validateOption = <_, A>(
  schema: Schema<_, A>
): (a: unknown, options?: ParseOptions) => Option<A> => getOption(AST.getTo(schema.ast))

/**
 * @category validation
 * @since 1.0.0
 */
export const validateEither = <_, A>(
  schema: Schema<_, A>
) => {
  const parser = go(AST.getTo(schema.ast))
  return (a: unknown, options?: ParseOptions): E.Either<NonEmptyReadonlyArray<PR.ParseError>, A> =>
    PR.eitherSync(parser(a, options))
}

/**
 * @category validation
 * @since 1.0.0
 */
export const validateEffect = <_, A>(
  schema: Schema<_, A>
) => {
  const parser = go(AST.getTo(schema.ast))
  return (a: unknown, options?: ParseOptions): PR.ParseResult<A> => parser(a, options)
}

/**
 * @category validation
 * @since 1.0.0
 */
export const is = <_, A>(schema: Schema<_, A>) => {
  const parser = validateEither(schema)
  return (a: unknown): a is A => E.isRight(parser(a))
}

/**
 * @since 1.0.0
 */
export type ToAsserts<S extends Schema<any>> = (
  input: unknown,
  options?: ParseOptions
) => asserts input is To<S>

/**
 * @category validation
 * @since 1.0.0
 */
export const asserts = <_, A>(schema: Schema<_, A>) => {
  const parser = validate(schema)
  return (a: unknown, options?: ParseOptions): asserts a is A => {
    parser(a, options)
  }
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encode = <I, A>(schema: Schema<I, A>): (a: A, options?: ParseOptions) => I =>
  get(AST.reverse(schema.ast))

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeOption = <I, A>(
  schema: Schema<I, A>
): (input: A, options?: ParseOptions) => Option<I> => getOption(AST.reverse(schema.ast))

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEither = <I, A>(
  schema: Schema<I, A>
) => {
  const parser = go(AST.reverse(schema.ast))
  return (a: A, options?: ParseOptions): E.Either<NonEmptyReadonlyArray<PR.ParseError>, I> =>
    PR.eitherSync(parser(a, options))
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEffect = <I, A>(
  schema: Schema<I, A>
) => {
  const parser = go(AST.reverse(schema.ast))
  return (a: A, options?: ParseOptions): PR.ParseResult<I> => parser(a, options)
}

interface Parser<I, A> {
  (i: I, options?: ParseOptions): ParseResult<A>
}

const go = I.memoize(untracedMethod(() =>
  (ast: AST.AST): Parser<any, any> => {
    switch (ast._tag) {
      case "Declaration":
        return ast.decode(...ast.typeParameters)
      case "Literal":
        return fromRefinement(ast, (u): u is typeof ast.literal => u === ast.literal)
      case "UniqueSymbol":
        return fromRefinement(ast, (u): u is typeof ast.symbol => u === ast.symbol)
      case "UndefinedKeyword":
        return fromRefinement(ast, P.isUndefined)
      case "VoidKeyword":
        return fromRefinement(ast, P.isUndefined)
      case "NeverKeyword":
        return fromRefinement(ast, P.isNever)
      case "UnknownKeyword":
      case "AnyKeyword":
        return PR.success
      case "StringKeyword":
        return fromRefinement(ast, P.isString)
      case "NumberKeyword":
        return fromRefinement(ast, P.isNumber)
      case "BooleanKeyword":
        return fromRefinement(ast, P.isBoolean)
      case "BigIntKeyword":
        return fromRefinement(ast, P.isBigint)
      case "SymbolKeyword":
        return fromRefinement(ast, P.isSymbol)
      case "ObjectKeyword":
        return fromRefinement(ast, P.isObject)
      case "Enums":
        return fromRefinement(ast, (u): u is any => ast.enums.some(([_, value]) => value === u))
      case "TemplateLiteral": {
        const regex = getTemplateLiteralRegex(ast)
        return fromRefinement(ast, (u): u is any => P.isString(u) && regex.test(u))
      }
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        return (input: unknown, options) => {
          if (!Array.isArray(input)) {
            return PR.failure(PR.type(unknownArray, input))
          }
          const output: Array<[number, any]> = []
          const es: Array<[number, PR.ParseError]> = []
          const allErrors = options?.allErrors
          let i = 0
          let stepKey = 0
          type State = {
            es: typeof es
            output: typeof output
          }
          const residual: Array<(_: State) => PR.ParseResult<void>> = []

          // ---------------------------------------------
          // handle elements
          // ---------------------------------------------
          for (; i < elements.length; i++) {
            if (input.length < i + 1) {
              // the input element is missing...
              if (!ast.elements[i].isOptional) {
                // ...but the element is required
                const e = PR.index(i, [PR.missing])
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return PR.failure(e)
                }
              }
            } else {
              const parser = elements[i]
              const te = parser(input[i], options)
              const t = PR.either(te)
              if (t) {
                if (E.isLeft(t)) {
                  // the input element is present but is not valid
                  const e = PR.index(i, t.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return PR.failures(mutableAppend(sortByIndex(es), e))
                  }
                }
                output.push([stepKey++, t.right])
              } else {
                const nk = stepKey++
                const index = i
                residual.push(
                  untracedMethod(() =>
                    ({ es, output }: State) =>
                      Effect.flatMap(Effect.either(te), (t) => {
                        if (E.isLeft(t)) {
                          // the input element is present but is not valid
                          const e = PR.index(index, t.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit()
                          } else {
                            return PR.failures(mutableAppend(sortByIndex(es), e))
                          }
                        }
                        output.push([nk, t.right])
                        return Effect.unit()
                      })
                  )
                )
              }
            }
          }
          // ---------------------------------------------
          // handle rest element
          // ---------------------------------------------
          if (O.isSome(rest)) {
            const head = RA.headNonEmpty(rest.value)
            const tail = RA.tailNonEmpty(rest.value)
            for (; i < input.length - tail.length; i++) {
              const te = head(input[i], options)
              const t = PR.either(te)
              if (t) {
                if (E.isLeft(t)) {
                  const e = PR.index(i, t.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return PR.failures(mutableAppend(sortByIndex(es), e))
                  }
                } else {
                  output.push([stepKey++, t.right])
                }
              } else {
                const nk = stepKey++
                const index = i
                residual.push(
                  untracedMethod(() =>
                    ({ es, output }: State) =>
                      Effect.flatMap(Effect.either(te), (t) => {
                        if (E.isLeft(t)) {
                          const e = PR.index(index, t.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit()
                          } else {
                            return PR.failures(mutableAppend(sortByIndex(es), e))
                          }
                        } else {
                          output.push([nk, t.right])
                          return Effect.unit()
                        }
                      })
                  )
                )
              }
            }
            // ---------------------------------------------
            // handle post rest elements
            // ---------------------------------------------
            for (let j = 0; j < tail.length; j++) {
              i += j
              if (input.length < i + 1) {
                // the input element is missing and the element is required, bail out
                return PR.failures(mutableAppend(sortByIndex(es), PR.index(i, [PR.missing])))
              } else {
                const te = tail[j](input[i], options)
                const t = PR.either(te)
                if (t) {
                  if (E.isLeft(t)) {
                    // the input element is present but is not valid
                    const e = PR.index(i, t.left)
                    if (allErrors) {
                      es.push([stepKey++, e])
                      continue
                    } else {
                      return PR.failures(mutableAppend(sortByIndex(es), e))
                    }
                  }
                  output.push([stepKey++, t.right])
                } else {
                  const nk = stepKey++
                  const index = i
                  residual.push(
                    untracedMethod(() =>
                      ({ es, output }: State) =>
                        Effect.flatMap(Effect.either(te), (t) => {
                          if (E.isLeft(t)) {
                            // the input element is present but is not valid
                            const e = PR.index(index, t.left)
                            if (allErrors) {
                              es.push([nk, e])
                              return Effect.unit()
                            } else {
                              return PR.failures(mutableAppend(sortByIndex(es), e))
                            }
                          }
                          output.push([nk, t.right])
                          return Effect.unit()
                        })
                    )
                  )
                }
              }
            }
          } else {
            // ---------------------------------------------
            // handle unexpected indexes
            // ---------------------------------------------
            const isUnexpectedAllowed = options?.isUnexpectedAllowed
            for (; i < input.length; i++) {
              const e = PR.index(i, [PR.unexpected(input[i])])
              if (!isUnexpectedAllowed) {
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return PR.failures(mutableAppend(sortByIndex(es), e))
                }
              }
            }
          }
          // ---------------------------------------------
          // compute output
          // ---------------------------------------------
          const computeResult = ({ es, output }: State) =>
            RA.isNonEmptyReadonlyArray(es) ?
              PR.failures(sortByIndex(es)) :
              PR.success(sortByIndex(output))
          return residual.length > 0 ?
            Effect.suspend(() => {
              const state: State = {
                es: Array.from(es),
                output: Array.from(output)
              }
              return Effect.flatMap(Effect.forEachDiscard(residual, (f) => f(state)), () =>
                computeResult(state))
            }) :
            computeResult({ output, es })
        }
      }
      case "TypeLiteral": {
        if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
          return fromRefinement(ast, P.isNotNullable)
        }
        const propertySignaturesTypes = ast.propertySignatures.map((f) =>
          go(f.type)
        )
        const indexSignatures = ast.indexSignatures.map((is) =>
          [go(is.parameter), go(is.type)] as const
        )
        return (input: unknown, options) => {
          if (!P.isRecord(input)) {
            return PR.failure(PR.type(unknownRecord, input))
          }
          const output: any = {}
          const expectedKeys: any = {}
          const es: Array<[number, PR.ParseError]> = []
          const allErrors = options?.allErrors
          let stepKey = 0
          const residual: Array<PR.ParseResult<void>> = []
          // ---------------------------------------------
          // handle property signatures
          // ---------------------------------------------
          for (let i = 0; i < propertySignaturesTypes.length; i++) {
            const ps = ast.propertySignatures[i]
            const parser = propertySignaturesTypes[i]
            const name = ps.name
            expectedKeys[name] = null
            if (!Object.prototype.hasOwnProperty.call(input, name)) {
              if (!ps.isOptional) {
                const e = PR.key(name, [PR.missing])
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return PR.failure(e)
                }
              }
            } else {
              const te = parser(input[name], options)
              const t = PR.either(te)
              if (t) {
                if (E.isLeft(t)) {
                  // the input key is present but is not valid
                  const e = PR.key(name, t.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return PR.failures(mutableAppend(sortByIndex(es), e))
                  }
                }
                output[name] = t.right
              } else {
                const nk = stepKey++
                const index = name
                residual.push(
                  untraced(() =>
                    Effect.flatMap(Effect.either(te), (t) => {
                      if (E.isLeft(t)) {
                        // the input key is present but is not valid
                        const e = PR.key(index, t.left)
                        if (allErrors) {
                          es.push([nk, e])
                          return Effect.unit()
                        } else {
                          return PR.failures(mutableAppend(sortByIndex(es), e))
                        }
                      }
                      output[index] = t.right
                      return Effect.unit()
                    })
                  )
                )
              }
            }
          }
          // ---------------------------------------------
          // handle index signatures
          // ---------------------------------------------
          if (indexSignatures.length > 0) {
            for (let i = 0; i < indexSignatures.length; i++) {
              const parameter = indexSignatures[i][0]
              const type = indexSignatures[i][1]
              const keys = I.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
              for (const key of keys) {
                if (Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                  continue
                }
                const te = parameter(key, options)
                // ---------------------------------------------
                // handle keys
                // ---------------------------------------------
                const t = PR.either(te)
                if (t) {
                  if (E.isLeft(t)) {
                    const e = PR.key(key, t.left)
                    if (allErrors) {
                      es.push([stepKey++, e])
                      continue
                    } else {
                      return PR.failures(mutableAppend(sortByIndex(es), e))
                    }
                  }
                } else {
                  const nk = stepKey++
                  const index = key
                  residual.push(
                    untraced(() =>
                      Effect.flatMap(Effect.either(te), (t) => {
                        if (E.isLeft(t)) {
                          const e = PR.key(index, t.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit()
                          } else {
                            return PR.failures(mutableAppend(sortByIndex(es), e))
                          }
                        }
                        return Effect.unit()
                      })
                    )
                  )
                }
                // ---------------------------------------------
                // handle values
                // ---------------------------------------------
                const tve = type(input[key], options)
                const tv = PR.either(tve)
                if (tv) {
                  if (E.isLeft(tv)) {
                    const e = PR.key(key, tv.left)
                    if (allErrors) {
                      es.push([stepKey++, e])
                      continue
                    } else {
                      return PR.failures(mutableAppend(sortByIndex(es), e))
                    }
                  } else {
                    output[key] = tv.right
                  }
                } else {
                  const nk = stepKey++
                  const index = key
                  residual.push(untraced(() =>
                    Effect.flatMap(
                      Effect.either(tve),
                      (tv) => {
                        if (E.isLeft(tv)) {
                          const e = PR.key(index, tv.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit()
                          } else {
                            return PR.failures(mutableAppend(sortByIndex(es), e))
                          }
                        } else {
                          output[key] = tv.right
                          return Effect.unit()
                        }
                      }
                    )
                  ))
                }
              }
            }
          } else {
            // ---------------------------------------------
            // handle unexpected keys
            // ---------------------------------------------
            const isUnexpectedAllowed = options?.isUnexpectedAllowed
            for (const key of Reflect.ownKeys(input)) {
              if (!(Object.prototype.hasOwnProperty.call(expectedKeys, key))) {
                const e = PR.key(key, [PR.unexpected(input[key])])
                if (!isUnexpectedAllowed) {
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return PR.failures(mutableAppend(sortByIndex(es), e))
                  }
                }
              }
            }
          }
          // ---------------------------------------------
          // compute output
          // ---------------------------------------------
          const computeResult = () =>
            RA.isNonEmptyReadonlyArray(es) ?
              PR.failures(sortByIndex(es)) :
              PR.success(output)
          return residual.length > 0 ?
            Effect.flatMap(Effect.collectAllDiscard(residual), () => computeResult()) :
            computeResult()
        }
      }
      case "Union": {
        const searchTree = _getSearchTree(ast.types)
        const ownKeys = Reflect.ownKeys(searchTree.keys)
        const len = ownKeys.length
        const otherwise = searchTree.otherwise
        const map = new Map<any, Parser<any, any>>()
        for (let i = 0; i < ast.types.length; i++) {
          map.set(ast.types[i], go(ast.types[i]))
        }
        return (input, options) => {
          const es: Array<[number, PR.ParseError]> = []
          let stepKey = 0
          let picks: Array<PR.ParseResult<unknown>> = []
          let finalResult: any = undefined
          if (len > 0) {
            // if there is at least one key then input must be an object
            if (P.isRecord(input)) {
              for (let i = 0; i < len; i++) {
                const name = ownKeys[i]
                const buckets = searchTree.keys[name].buckets
                // for each property that should contain a literal, check if the input contains that property
                if (Object.prototype.hasOwnProperty.call(input, name)) {
                  const literal = String(input[name])
                  // check that the value obtained from the input for the property corresponds to an existing bucket
                  if (Object.prototype.hasOwnProperty.call(buckets, literal)) {
                    // retrive the minimal set of candidates for decoding
                    const bucket = buckets[literal]
                    for (let i = 0; i < bucket.length; i++) {
                      const te = map.get(bucket[i])!(input, options)
                      const t = picks.length === 0 ? PR.either(te) : undefined
                      if (t) {
                        if (E.isRight(t)) {
                          return PR.success(t.right)
                        } else {
                          es.push([stepKey++, PR.unionMember(t.left)])
                        }
                      } else {
                        const nk = stepKey++
                        picks.push(
                          untraced(() =>
                            Effect.suspend(() => {
                              if (finalResult) {
                                return Effect.unit()
                              } else {
                                return Effect.flatMap(Effect.either(te), (t) => {
                                  if (E.isRight(t)) {
                                    finalResult = PR.success(t.right)
                                  } else {
                                    es.push([nk, PR.unionMember(t.left)])
                                  }
                                  return Effect.unit()
                                })
                              }
                            })
                          )
                        )
                      }
                    }
                  } else {
                    es.push([
                      stepKey++,
                      PR.key(name, [PR.type(
                        searchTree.keys[name].ast,
                        input[name]
                      )])
                    ])
                  }
                } else {
                  es.push([stepKey++, PR.key(name, [PR.missing])])
                }
              }
            } else {
              es.push([stepKey++, PR.type(unknownRecord, input)])
            }
          }

          const computeResult = () =>
            RA.isNonEmptyReadonlyArray(es) ?
              PR.failures(sortByIndex(es)) :
              PR.failure(PR.type(AST.neverKeyword, input))

          if (picks.length > 0) {
            return Effect.flatMap(
              Effect.collectAllDiscard(picks),
              () => {
                if (finalResult) {
                  return finalResult
                }
                picks = []
                // if none of the schemas with at least one property with a literal value succeeded,
                // proceed with those that have no literal at all
                for (let i = 0; i < otherwise.length; i++) {
                  const te = map.get(otherwise[i])!(input, options)
                  const t = picks.length === 0 ? PR.either(te) : undefined
                  if (t) {
                    if (E.isRight(t)) {
                      return PR.success(t.right)
                    } else {
                      es.push([stepKey++, PR.unionMember(t.left)])
                    }
                  } else {
                    const nk = stepKey++
                    picks.push(
                      untraced(() =>
                        Effect.suspend(() => {
                          if (finalResult) {
                            return Effect.unit()
                          } else {
                            return Effect.flatMap(Effect.either(te), (t) => {
                              if (E.isRight(t)) {
                                finalResult = PR.success(t.right)
                              } else {
                                es.push([nk, PR.unionMember(t.left)])
                              }
                              return Effect.unit()
                            })
                          }
                        })
                      )
                    )
                  }
                }
                // ---------------------------------------------
                // compute output
                // ---------------------------------------------
                if (picks.length > 0) {
                  Effect.flatMap(
                    Effect.collectAllDiscard(picks),
                    () => {
                      if (finalResult) {
                        return finalResult
                      }
                      return computeResult()
                    }
                  )
                }
                return computeResult()
              }
            )
          } else {
            // if none of the schemas with at least one property with a literal value succeeded,
            // proceed with those that have no literal at all
            for (let i = 0; i < otherwise.length; i++) {
              const te = map.get(otherwise[i])!(input, options)
              const t = picks.length === 0 ? PR.either(te) : undefined
              if (t) {
                if (E.isRight(t)) {
                  return PR.success(t.right)
                } else {
                  es.push([stepKey++, PR.unionMember(t.left)])
                }
              } else {
                const nk = stepKey++
                picks.push(
                  untraced(() =>
                    Effect.suspend(() => {
                      if (finalResult) {
                        return Effect.unit()
                      } else {
                        return Effect.flatMap(Effect.either(te), (t) => {
                          if (E.isRight(t)) {
                            finalResult = PR.success(t.right)
                          } else {
                            es.push([nk, PR.unionMember(t.left)])
                          }
                          return Effect.unit()
                        })
                      }
                    })
                  )
                )
              }
            }
            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            if (picks.length > 0) {
              return Effect.flatMap(
                Effect.collectAllDiscard(picks),
                () => {
                  if (finalResult) {
                    return finalResult
                  }
                  return computeResult()
                }
              )
            }
            return computeResult()
          }
        }
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<typeof f, Parser<any, any>>(f)
        return (a, options) => get(f)(a, options)
      }
      case "Refinement":
      case "Transform": {
        const from = go(ast.from)
        const to = AST.hasTransformation(ast.to) ? go(ast.to) : PR.success
        return (i1, options) =>
          PR.flatMap(
            from(i1, options),
            (a) => PR.flatMap(ast.decode(a, options), (i2) => to(i2, options))
          )
      }
    }
  }
))

const fromRefinement = <A>(ast: AST.AST, refinement: (u: unknown) => u is A): Parser<unknown, A> =>
  (u) => refinement(u) ? PR.success(u) : PR.failure(PR.type(ast, u))

/** @internal */
export const _getLiterals = (
  ast: AST.AST
): ReadonlyArray<[PropertyKey, AST.Literal]> => {
  switch (ast._tag) {
    case "Declaration":
      return _getLiterals(ast.type)
    case "TypeLiteral": {
      const out: Array<[PropertyKey, AST.Literal]> = []
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const propertySignature = ast.propertySignatures[i]
        const type = AST.getFrom(propertySignature.type)
        if (AST.isLiteral(type) && !propertySignature.isOptional) {
          out.push([propertySignature.name, type])
        }
      }
      return out
    }
    case "Refinement":
    case "Transform":
      return _getLiterals(ast.from)
  }
  return []
}

/**
 * The purpose of the algorithm is to narrow down the pool of possible candidates for decoding as much as possible.
 *
 * This function separates the schemas into two groups, `keys` and `otherwise`:
 *
 * - `keys`: the schema has at least one property with a literal value
 * - `otherwise`: the schema has no properties with a literal value
 *
 * If a schema has at least one property with a literal value, so it ends up in `keys`, first a namespace is created for
 * the name of the property containing the literal, and then within this namespace a "bucket" is created for the literal
 * value in which to store all the schemas that have the same property and literal value.
 *
 * @internal
 */
export const _getSearchTree = (
  members: ReadonlyArray<AST.AST>
): {
  keys: {
    readonly [key: PropertyKey]: {
      buckets: { [literal: string]: ReadonlyArray<AST.AST> }
      ast: AST.AST // this is for error messages
    }
  }
  otherwise: ReadonlyArray<AST.AST>
} => {
  const keys: {
    [key: PropertyKey]: {
      buckets: { [literal: string]: Array<AST.AST> }
      ast: AST.AST
    }
  } = {}
  const otherwise: Array<AST.AST> = []
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const tags = _getLiterals(member)
    if (tags.length > 0) {
      for (let j = 0; j < tags.length; j++) {
        const [key, literal] = tags[j]
        const hash = String(literal.literal)
        keys[key] = keys[key] || { buckets: {}, ast: AST.neverKeyword }
        const buckets = keys[key].buckets
        if (Object.prototype.hasOwnProperty.call(buckets, hash)) {
          if (j < tags.length - 1) {
            continue
          }
          buckets[hash].push(member)
          keys[key].ast = AST.createUnion([keys[key].ast, literal])
        } else {
          buckets[hash] = [member]
          keys[key].ast = AST.createUnion([keys[key].ast, literal])
          break
        }
      }
    } else {
      otherwise.push(member)
    }
  }
  return { keys, otherwise }
}

const unknownArray = AST.createTuple([], O.some([AST.unknownKeyword]), true)

const unknownRecord = AST.createTypeLiteral([], [
  AST.createIndexSignature(AST.stringKeyword, AST.unknownKeyword, true),
  AST.createIndexSignature(AST.symbolKeyword, AST.unknownKeyword, true)
])

const mutableAppend = <A>(self: Array<A>, a: A): NonEmptyReadonlyArray<A> => {
  self.push(a)
  return self as any
}

const getTemplateLiteralRegex = (ast: AST.TemplateLiteral): RegExp => {
  let pattern = `^${ast.head}`
  for (const span of ast.spans) {
    if (AST.isStringKeyword(span.type)) {
      pattern += ".*"
    } else if (AST.isNumberKeyword(span.type)) {
      pattern += "-?\\d+(\\.\\d+)?"
    }
    pattern += span.literal
  }
  pattern += "$"
  return new RegExp(pattern)
}

function sortByIndex<T>(es: RA.NonEmptyReadonlyArray<[number, T]>): RA.NonEmptyReadonlyArray<T>
function sortByIndex<T>(es: Array<[number, T]>): Array<T>
function sortByIndex(es: any): any {
  // @ts-expect-error
  return es.sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0).map(([_, a]) => a)
}
