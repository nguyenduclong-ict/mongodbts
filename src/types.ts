export type LiteralUnion<T extends U, U = string | symbol | number> =
  | T
  | (U & {})
