import * as A from "@fp-ts/codec/Annotation"
import * as M from "@fp-ts/codec/AST"
import { unsafeGuardFor } from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

describe("Schema", () => {
  it("make", () => {
    expect(S.make).exist
  })

  it("withName", () => {
    const schema = pipe(S.string, S.withName("A"))
    expect(A.getName(schema.ast.annotations)).toEqual(O.some("A"))
  })

  it("rename", () => {
    const rename = <A, From extends keyof A, To extends PropertyKey>(
      from: From,
      to: To
    ) =>
      (schema: S.Schema<A>): S.Schema<Omit<A, From> & { [K in To]: A[From] }> => {
        if (M.isStruct(schema.ast)) {
          const fields = schema.ast.fields.slice()
          const i = fields.findIndex((field) => field.key === from)
          fields[i] = M.field(to, fields[i].value, fields[i].optional, fields[i].readonly)
          return S.make(M.struct(fields, schema.ast.indexSignature))
        }
        throw new Error("cannot rename")
      }

    const schema = pipe(
      S.struct({
        a: S.string,
        b: S.number
      }),
      rename("a", "aa")
    )
    const guard = unsafeGuardFor(schema)
    expect(guard.is({ a: "foo", b: 1 })).toEqual(false)
    expect(guard.is({ aa: "foo", b: 1 })).toEqual(true)
  })

  describe("keyof", () => {
    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      const keyOf = S.keyof(schema)
      const guard = unsafeGuardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(true)
      expect(guard.is("c")).toEqual(false)
    })

    it("union", () => {
      const schema = S.union(
        S.struct({
          a: S.string,
          b: S.number
        }),
        S.struct({
          a: S.boolean,
          c: S.number
        })
      )
      const keyOf = S.keyof(schema)
      const guard = unsafeGuardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(false)
      expect(guard.is("c")).toEqual(false)
    })
  })
})
