/**
 * @since 1.0.0
 */

import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import type { Schema } from "@fp-ts/codec/Schema"
import type { Support } from "@fp-ts/codec/Support"

/**
 * @since 1.0.0
 */
export interface Codec<in out IO> {
  readonly unsafeDecoderFor: (
    supports: Support
  ) => <A>(schema: Schema<A>) => Decoder<IO, A>
  readonly unsafeEncoderFor: (
    supports: Support
  ) => <A>(schema: Schema<A>) => Encoder<IO, A>
}
