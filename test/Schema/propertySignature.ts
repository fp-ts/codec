import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

describe.concurrent("propertySignature", () => {
  it("should add annotations", () => {
    const schema = S.struct({
      a: S.propertySignature(S.string, {
        title: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      })
    })
    const ast: any = schema.ast
    expect(ast.propertySignatures[0].annotations).toEqual({
      [AST.TitleAnnotationId]: "title",
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })
})
