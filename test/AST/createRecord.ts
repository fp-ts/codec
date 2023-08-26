import * as AST from "@effect/schema/AST"

describe.concurrent("AST/createRecord", () => {
  it("numeric literal", () => {
    expect(AST.createRecord(AST.createLiteral(1), AST.numberKeyword, true)).toEqual(
      AST.createTypeLiteral([AST.createPropertySignature(1, AST.numberKeyword, false, true)], [])
    )
  })

  it("should throw on unsupported keys", () => {
    expect(() => AST.createRecord(AST.undefinedKeyword, AST.numberKeyword, true)).toThrowError(
      new Error("createRecord: unsupported key UndefinedKeyword")
    )
  })

  it("should throw on unsupported literals", () => {
    expect(() => AST.createRecord(AST.createLiteral(true), AST.numberKeyword, true)).toThrowError(
      new Error("createRecord: unsupported literal true")
    )
  })
})
