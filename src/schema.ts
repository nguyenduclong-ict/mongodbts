import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { unset } from 'lodash'
import { Schema, SchemaDefinitionProperty, SchemaOptions } from 'mongoose'
import { KEYS } from './constants'
import { hooks } from './meta'
import { IsObjectId, IsRequired } from './validate'

export interface MongoSchemaOptions extends SchemaOptions {
  name?: string // name show on client
  description?: string
}

// <==== decorators
export function Entity(options: MongoSchemaOptions = {}) {
  return function (constructor: any) {
    options = {
      id: true,
      versionKey: false,
      ...options,
    }
    Reflect.defineMetadata(KEYS.SCHEMA_OPTIONS, options, constructor)
  }
}

export type FieldType = SchemaDefinitionProperty<any> & {
  type?: any
  default?: any
  addValidate?: boolean
}

const getType = (type: any) => {
  return type?.schemaName || type?.name
}

const addValidate = (item: any, taget: any, propertyKey: string) => {
  const isMakeValidate = (obj: any) => {
    return (
      !Object.prototype.hasOwnProperty.call(obj, 'addValidate') ||
      obj.addValidate === true
    )
  }

  if (!isMakeValidate(Array.isArray(item) ? item[0] : item)) return

  const each = Array.isArray(item) || item.type?.name === 'Array'
  const isRequired = each ? !!item[0].required : !!item.required
  const type = each
    ? getType(item[0].type) || getType(item[0])
    : getType(item.type) || getType(item)
  const result = []

  // console.log('=>>>', propertyKey, { isRequired, type })
  if (!isRequired) result.push(IsOptional({ each }))
  else {
    result.push(IsRequired({ each }))
  }

  switch (type) {
    case 'String':
      if (each) result.push(IsArray())
      if (item.minlength >= 0) result.push(MinLength(item.minlength))
      else if (item.maxlength >= 0) result.push(MaxLength(item.maxlength))
      else if (item.length >= 0) result.push(Length(item.length))
      else result.push(IsString())
      if (item.enum) result.push(IsIn(item.enum))
      break
    case 'Number':
      if (each) result.push(IsArray())
      if (item.min >= 0) result.push(Min(item.max, { each }))
      else if (item.max >= 0) result.push(Max(item.max, { each }))
      else result.push(IsString())
      if (item.enum) result.push(IsIn(item.enum, { each }))
      break
    case 'Boolean':
      if (each) result.push(IsArray())
      result.push(IsBoolean({ each }))
      break
    case 'ObjectId':
      result.push(IsObjectId({ each }))
      break
  }

  result.forEach((func) => func(taget, propertyKey))
}

const getBaseDefine = (define: any) => {
  if (Array.isArray(define)) {
    for (let index = 0; index < define.length; index++) {
      const item = define[index]
      define[index] = getBaseDefine(item)
    }
    return define
  } else {
    unset(define, 'addValidate')
    return define
  }
}

export function Field(field: FieldType): PropertyDecorator {
  if ([String, Boolean, Number].includes(field as any)) {
    field = {
      type: field,
    }
  }

  return function (target: any, propertyKey: string | symbol) {
    const fieldDefine = getBaseDefine(field)

    addValidate(fieldDefine, target, propertyKey as any)

    const definition =
      Reflect.getOwnMetadata(KEYS.SCHEMA_DEFINITION, target.constructor) || {}
    definition[propertyKey] = fieldDefine
    Reflect.defineMetadata(
      KEYS.SCHEMA_DEFINITION,
      definition,
      target.constructor
    )

    // add raw defind for get object description of entity
    const raw =
      Reflect.getOwnMetadata(KEYS.SCHEMA_RAW, target.constructor) || {}
    raw[propertyKey] = {
      ...(Array.isArray(fieldDefine) ? fieldDefine[0] : fieldDefine),
      isArray:
        Array.isArray(fieldDefine) || getType(fieldDefine.type) === 'Array',
      type: Array.isArray(fieldDefine)
        ? getType(fieldDefine[0].type) || getType(fieldDefine[0])
        : getType(fieldDefine.type) || getType(fieldDefine),
    }

    Reflect.defineMetadata(KEYS.SCHEMA_RAW, raw, target.constructor)
  }
}

export function Index<E = any>(
  fields: { [K in keyof E]?: 0 | 1 | 'text' },
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
    // const value =
    //   Reflect.getOwnMetadata(KEYS.SCHEMA_CASCADE, target.constructor) || {}
    // value[propertyKey] = options
    // Reflect.defineMetadata(KEYS.SCHEMA_CASCADE, value, target.constructor)
    const value = hooks.cascade.get(target.constructor) || {}
    value[propertyKey] = options
    hooks.cascade.set(target.constructor, value)
  }
}
// decorators ====>

// <==== funtioncs
export function createSchema<E = any>(EC: any): Schema<E> {
  const options: SchemaOptions =
    Reflect.getMetadata(KEYS.SCHEMA_OPTIONS, EC) || {}
  const definition = Reflect.getMetadata(KEYS.SCHEMA_DEFINITION, EC) || {}
  const indexes: any[] = Reflect.getMetadata(KEYS.SCHEMA_INDEXES, EC) || []
  const rawDefinition = Reflect.getMetadata(KEYS.SCHEMA_RAW, EC) || {}

  if (options.timestamps) {
    if (!rawDefinition.createdAt) {
      rawDefinition.createdAt = {
        type: getType(Date),
        auto: true,
      }
    }

    if (!rawDefinition.updatedAt) {
      rawDefinition.updatedAt = {
        type: getType(Date),
        auto: true,
      }
    }
  }

  // @ts-ignore
  // const schemaDf: any = {}
  // Object.keys(definition).forEach((key) => {
  //   const fieldDefine = definition[key]
  //   const { __raw, ...fd } = fieldDefine
  //   schemaDf[key] = __raw || fd
  // })

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
