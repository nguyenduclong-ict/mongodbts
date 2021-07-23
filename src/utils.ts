import 'reflect-metadata'
import { ConnectOptions, createConnection } from 'mongoose'
import { CascadeOptions } from 'schema'
import { KEYS } from './constants'
import get from 'lodash/get'
import set from 'lodash/set'
import pick from 'lodash/pick'

export { get, set, pick }

export function createMongoConnection(uri: string, options?: ConnectOptions) {
  const connection = createConnection(uri || 'mongodb://localhost:27017', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    autoIndex: true,
    ...options,
  })

  const ready = new Promise((resolve) => {
    connection.on('connected', () => {
      console.log('connected database', connection.db.databaseName)
      resolve(connection)
    })
  })

  return { connection, ready }
}

export function omitBy<T extends object>(
  value: T,
  omitCheck: ((k: string, v: any) => boolean) | any[] | number | string | object
): Partial<T> {
  const result: any = {}
  Object.keys(value).forEach((key) => {
    if (
      typeof omitCheck === 'function' &&
      omitCheck(key, (value as any)[key])
    ) {
      return
    }

    if (Array.isArray(omitCheck) && omitCheck.includes((value as any)[key])) {
      return
    }

    if (omitCheck === (value as any)[key]) return

    result[key] = (value as any)[key]
  })

  return result
}

export function getHooks(key: any, target: any) {
  const result: { [x: string]: any[] } = {}
  const proto = Object.getPrototypeOf(target)

  if (proto && proto !== Object.getPrototypeOf(Function)) {
    const parent = getHooks(key, proto)
    Object.keys(parent).forEach((k) => {
      if (result[k]) result[k].push(...parent[k])
      else result[k] = parent[k]
    })
  }

  const data = Reflect.getOwnMetadata(key, target)

  if (data) {
    Object.keys(data).forEach((k) => {
      if (result[k]) result[k].push(...data[k])
      else result[k] = data[k]
    })
  }

  return result
}

export function getActions(target: any) {
  const key = KEYS.REPOSITORY_ACTIONS
  const result: string[] = []
  const proto = Object.getPrototypeOf(target)

  if (proto && proto !== Object.getPrototypeOf(Function)) {
    result.push(...getActions(proto))
  }
  result.push(...(Reflect.getOwnMetadata(key, target) || []))

  return result
}

export function getCascades(target: any) {
  const result: { [x: string]: CascadeOptions } = {}
  const proto = Object.getPrototypeOf(target)

  if (proto && proto !== Object.getPrototypeOf(Function)) {
    const parent = getHooks(KEYS.SCHEMA_CASCADE, proto)
    Object.assign(result, parent)
  }

  const data = Reflect.getOwnMetadata(KEYS.SCHEMA_CASCADE, target)

  if (data) {
    Object.assign(result, data)
  }

  return result
}

// mongoid
// -------
export const toMongoId = (value: any) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (value.constructor.name === 'ObjectID') return value.toHexString()
    return value._id || value.id
  }
}

export const idIsEqual = (val1: any, val2: any) =>
  toMongoId(val1) === toMongoId(val2)
