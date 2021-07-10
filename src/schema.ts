import { Schema, SchemaDefinition, SchemaOptions } from 'mongoose'
import 'reflect-metadata'
import { KEYS } from './constants'

// <==== decorators
export function Entity(options: SchemaOptions = {}) {
  return function (constructor: any) {
    options = {
      id: true,
      versionKey: false,
      ...options,
    }
    Reflect.defineMetadata(KEYS.SCHEMA_OPTIONS, options, constructor)
  }
}

export function Field(fieldDefinition: SchemaDefinition[''] | { type: any }) {
  return function (target: any, propertyKey: string) {
    const definition =
      Reflect.getOwnMetadata(KEYS.SCHEMA_DEFINITION, target.constructor) || {}
    definition[propertyKey] = fieldDefinition
    Reflect.defineMetadata(
      KEYS.SCHEMA_DEFINITION,
      definition,
      target.constructor
    )
  }
}

export function Index<E = any>(
  fields: { [K in keyof E]: 0 | 1 },
  options?: any
) {
  return function (constructor: any) {
    const value = Reflect.getOwnMetadata(KEYS.SCHEMA_INDEXES, constructor) || []
    value.push({ fields, options })
    Reflect.defineMetadata(KEYS.SCHEMA_INDEXES, value, constructor)
  }
}

export interface CascadeOptions {
  // if true when create document will create all reference
  create?: boolean
  // if true when update document will update all reference
  update?: boolean
  // if true when delete document will delete all reference
  delete?: boolean
  /**
   * 'none' when reference delete no action
   * 'null' when reference delete set field to null
   * 'cascade' when reference delete => remove this document
   */
  onDelete?: 'none' | 'null' | 'cascade'
}

export function Cascade(
  options: CascadeOptions = {
    create: true,
    update: true,
    delete: false,
    onDelete: 'none',
  }
) {
  return function (target: any, propertyKey: string) {
    const value =
      Reflect.getOwnMetadata(KEYS.SCHEMA_CASCADE, target.constructor) || {}
    value[propertyKey] = options
    Reflect.defineMetadata(KEYS.SCHEMA_CASCADE, value, target.constructor)
  }
}
// decorators ====>

// <==== funtioncs
export function createSchema<E = any>(EC: any): Schema<E> {
  const options: SchemaOptions =
    Reflect.getMetadata(KEYS.SCHEMA_OPTIONS, EC) || {}
  const definition = Reflect.getMetadata(KEYS.SCHEMA_DEFINITION, EC) || {}
  const indexes: any[] = Reflect.getMetadata(KEYS.SCHEMA_INDEXES, EC) || []

  const schema = new Schema<E>(definition, options)

  indexes.forEach(({ fields, options: opts }) => {
    schema.index(fields, opts)
  })

  if (options.id) {
    schema.set('toJSON', {
      virtuals: true,
      versionKey: false,
      transform: (doc: any, ret: any) => {
        delete ret._id
        ret.id = doc._id
      },
    })
    schema.set('toObject', {
      virtuals: true,
      versionKey: false,
      transform: (doc: any, ret: any) => {
        delete ret._id
        ret.id = doc._id
      },
    })
  }

  return schema
}

// <==== interfaces
export interface Timestamp {
  readonly createdAt?: Date
  readonly updatedAt?: Date
}

export type Entity<E> = E & {
  readonly id?: any
  readonly _id?: any
}
