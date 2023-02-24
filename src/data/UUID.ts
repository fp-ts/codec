/**
 * @since 1.0.0
 */

import * as A from "@fp-ts/schema/annotation/AST"
import { pipe } from "@effect/data/Function"
import * as H from "@fp-ts/schema/annotation/Hook"
import { make } from "@fp-ts/schema/Arbitrary"
import * as S from "@fp-ts/schema/Schema"

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @since 1.0.0
 */
export const UuidId = "@fp-ts/schema/data/String/UuidId"

/**
 * @since 1.0.0
 */
export const UUID: S.Schema<string> = pipe(
  S.string,
  S.pattern(uuidRegex),
  S.annotations({
    [A.IdId]: UuidId,
    [H.ArbitraryHookId]: H.hook(() => make(UUID, (fc) => fc.uuid()))
  })
)
