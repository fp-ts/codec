import { pipe } from "@effect/data/Function";
import * as S from "@effect/schema/Schema";
import * as T from "@effect/schema/Codec";

// $ExpectError
pipe(S.boolean, S.optional, S.nullable)

// $ExpectError
pipe(S.boolean, T.optional, T.nullable)

// $ExpectError
S.struct({ a: S.string, b: S.number, c: T.optional(S.boolean).withDefault(() => true) });