export type LiteralUnion<T extends U, U = string | symbol | number> =
  | T
  | (U & {})

declare global {
  namespace Mongodbts {
    export interface BaseMeta {
      skipHook?: boolean
      [x: string]: any
    }

    export interface BaseOptions {
      [x: string]: any
    }
  }
}

export {}
