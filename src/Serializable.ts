/**
 * @since 1.0.0
 *
 * Serializable represents an object that has self-contained Schema(s)
 */
import type * as Schema from "./Schema.js"

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbol: unique symbol = Symbol.for("@effect/schema/Serializable")

/**
 * @since 1.0.0
 * @category model
 */
export interface Serializable {
  readonly [symbol]: Serializable.Schemas
}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace Serializable {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Schemas {
    readonly Self: Schema.Schema<unknown, any>
  }
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const selfSchema = <A extends Serializable>(self: A): A[typeof symbol]["Self"] =>
  self[symbol].Self

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbolResult: unique symbol = Symbol.for(
  "@effect/schema/Serializable/SerializableResult"
)

/**
 * @since 1.0.0
 * @category model
 */
export interface SerializableWithResult extends Serializable {
  readonly [symbolResult]: SerializableWithResult.Schemas
}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace SerializableWithResult {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Schemas {
    readonly Failure: Schema.Schema<unknown, any>
    readonly Success: Schema.Schema<unknown, any>
  }
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const failureSchema = <A extends SerializableWithResult>(
  self: A
): A[typeof symbolResult]["Failure"] => self[symbolResult].Failure

/**
 * @since 1.0.0
 * @category accessor
 */
export const successSchema = <A extends SerializableWithResult>(
  self: A
): A[typeof symbolResult]["Success"] => self[symbolResult].Success
