import {
  Connection,
  connection as defaultConnection,
  FilterQuery,
  isValidObjectId,
  Model,
  PopulateOptions,
  Schema,
  UpdateQuery,
} from 'mongoose'
import { ObjectId } from 'mongodb'
import { KEYS } from './constants'
import { CascadeOptions, createSchema } from './schema'
import { getActions, getCascades, getHooks, omitBy } from './utils'
import EventEmmit from 'events'

// <==== decorators
type Constructor<T = {}> = new (...args: any[]) => T

// @ts-ignore
export function repository(EntityClass: any, connection?: Connection) {
  return function <T extends Constructor<Reposiory>>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args)
        this.name = constructor.name
        const actions: string[] = getActions(constructor)
        const cascade = getCascades(EntityClass)
        const before = getHooks(KEYS.REPOSITORY_BEFORE, constructor)
        const after = getHooks(KEYS.REPOSITORY_AFTER, constructor)

        this.$before = this.$before || {}
        this.$after = this.$after || {}

        Object.keys(Reposiory.global.before).forEach((key) => {
          const handlers = Reposiory.global.before[key]
          if (key.startsWith('/') && key.endsWith('/')) {
            // is regex
            const rg = new RegExp(key.slice(1, key.length - 1))
            const matchs = actions.filter((action) => rg.test(action))
            matchs.forEach((action) => {
              this.$before[action] = this.$before[action] || []
              this.$before[action].push(...handlers)
            })
          } else {
            this.$before[key] = this.$before[key] || []
            this.$before[key].push(...handlers)
          }
        })

        Object.keys(before).forEach((key) => {
          const handlers = before[key]
          if (key.startsWith('/') && key.endsWith('/')) {
            // is regex
            const rg = new RegExp(key.slice(1, key.length - 1))
            const matchs = actions.filter((action) => rg.test(action))
            matchs.forEach((action) => {
              this.$before[action] = this.$before[action] || []
              this.$before[action].push(...handlers)
            })
          } else {
            this.$before[key] = this.$before[key] || []
            this.$before[key].push(...handlers)
          }
        })

        Object.keys(after).forEach((key) => {
          const handlers = after[key]
          if (key.startsWith('/') && key.endsWith('/')) {
            // is regex
            const rg = new RegExp(key.slice(1, key.length - 1))
            const matchs = actions.filter((action) => rg.test(action))
            matchs.forEach((action) => {
              this.$after[action] = this.$after[action] || []
              this.$after[action].push(...handlers)
            })
          } else {
            this.$after[key] = this.$after[key] || []
            this.$after[key].push(...handlers)
          }
        })

        Object.keys(Reposiory.global.after).forEach((key) => {
          const handlers = Reposiory.global.after[key]
          if (key.startsWith('/') && key.endsWith('/')) {
            // is regex
            const rg = new RegExp(key.slice(1, key.length - 1))
            const matchs = actions.filter((action) => rg.test(action))
            matchs.forEach((action) => {
              this.$after[action] = this.$after[action] || []
              this.$after[action].push(...handlers)
            })
          } else {
            this.$after[key] = this.$after[key] || []
            this.$after[key].push(...handlers)
          }
        })

        this.schema = this.onCreateSchema(createSchema(EntityClass))
        this.connection = this.connection || connection || defaultConnection
        this.model =
          this.connection.models[EntityClass.name] ||
          this.connection.model(EntityClass.name, this.schema)
        this.$cascade = cascade

        Reposiory.registerRepository(this.connection, this)
        this.baseOnInited()
        this.onInited()
      }

      baseOnInited() {
        for (const key in this.$cascade) {
          const item = this.$cascade[key]
          if (item.onDelete === 'null') {
            const { isArray, ref } = this.getRef(key)
            this.$events.addListener(
              `${ref}:delete`,
              async (deleted: any[] = []) => {
                if (!deleted.length) return
                const ids = deleted.map((e) => e._id)
                return this.model.updateMany(
                  {
                    [key]: { $in: ids },
                  },
                  isArray
                    ? {
                        $pullAll: {
                          [key]: ids,
                        },
                      }
                    : {
                        [key]: null,
                      }
                )
              }
            )
          }

          if (item.onDelete === 'cascade') {
            const { ref } = this.getRef(key)
            this.$events.addListener(`${ref}:delete`, (deleted: any[] = []) => {
              if (deleted.length) return
              this.delete({
                query: {
                  [key]: { $in: deleted.map((e) => e._id) },
                },
                meta: {
                  skipHook: true,
                },
              })
            })
          }
        }
      }
    }
  }
}

export function Before(...actions: any[]) {
  return function (target: Reposiory, propertyKey: string) {
    const value =
      Reflect.getOwnMetadata(KEYS.REPOSITORY_BEFORE, target.constructor) || {}

    actions.forEach((action) => {
      if (!value[action]) value[action] = []
      value[action].push(propertyKey)
    })

    Reflect.defineMetadata(KEYS.REPOSITORY_BEFORE, value, target.constructor)
  }
}

export function After(...actions: any[]) {
  return function (target: Reposiory, propertyKey: string) {
    const value =
      Reflect.getOwnMetadata(KEYS.REPOSITORY_AFTER, target.constructor) || {}

    actions.forEach((action) => {
      if (!value[action]) value[action] = []
      value[action].push(propertyKey)
    })

    Reflect.defineMetadata(KEYS.REPOSITORY_AFTER, value, target.constructor)
  }
}

export function Action() {
  return function (
    target: Reposiory,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const value =
      Reflect.getOwnMetadata(KEYS.REPOSITORY_ACTIONS, target.constructor) || []
    value.push(propertyKey)
    Reflect.defineMetadata(KEYS.REPOSITORY_ACTIONS, value, target.constructor)

    const method = descriptor.value
    descriptor.value = async function (...args: any) {
      const self = this as any

      const skipHook = args[0]?.meta?.skipHook

      if (!skipHook) {
        for (const name of self.$before[propertyKey] || []) {
          if (typeof name === 'string') {
            await (self as any)[name]?.call(self, ...args)
          } else if (typeof name === 'function') {
            await name.call(self, ...args)
          }
        }
      }

      let result = await method.call(self, ...args)

      if (!skipHook) {
        for (const name of self.$after[propertyKey] || []) {
          if (typeof name === 'string') {
            result = await (self as any)[name]?.call(self, ...args, result)
          } else if (typeof name === 'function') {
            result = await name.call(self, ...args, result)
          }
        }
      }

      return result
    }
  }
}
// decorators ====>

/** Context */
export interface Context<M = {}> {
  meta?: M & { skipHook?: boolean; [x: string]: any }
}

/** FindOne Context */
export interface ContextOptions<E> {
  project?: { [K in keyof E]: 0 | 1 } & { [x: string]: 0 | 1 }
  fields?: (keyof E)[]
  sort?: { [K in keyof E]: 0 | 1 } & { [x: string]: 0 | 1 }
  populates?: (keyof E)[] | Array<PopulateOptions>
  limit?: number
  skip?: number
  session?: any
}

export interface FindOneContext<E = any, M = {}>
  extends Context<M>,
    ContextOptions<E> {
  query?: FilterQuery<E>
}

/** FindOne Context */
export interface FindContext<E = any, M = {}> extends FindOneContext<E, M> {}

/** List Context */
export interface ListContext<E = any, M = {}> extends FindContext<E, M> {
  page?: number
  pageSize?: number
}

/** Create Context */
interface ContextCreate<E = any, M = { cascadeContext?: CascadeContext }>
  extends Context<M> {
  data: E
  session?: any
  safe?: boolean
  populates?: (keyof E)[] | Array<PopulateOptions>
}

/** CreateMany Context */
interface ContextCreateMany<E = any, M = { cascadeContext?: CascadeContext }>
  extends Context<M>,
    ContextOptions<E> {
  data: E[]
  safe?: boolean
  session?: any
  populates?: (keyof E)[] | Array<PopulateOptions>
}

/** Update Context */
interface ContextUpdate<E = any, M = { cascadeContext?: CascadeContext }>
  extends Context<M>,
    ContextOptions<E> {
  query: FilterQuery<E>
  data: UpdateQuery<E>
  upsert?: boolean
  populates?: (keyof E)[] | Array<PopulateOptions>
}

/** Delete Context */
interface ContextDelete<E = any, M = {}> extends Context<M>, ContextOptions<E> {
  query: FilterQuery<E>
}

export interface CascadeContext {
  rollbacked: boolean
  rollbacks: any[]
}

/**
 * Repository
 */
export class Reposiory<E = any> {
  name: string
  model: Model<E>
  schema: Schema<E>
  connection: Connection

  static global: { before: any; after: any } = {
    before: {},
    after: {},
  }

  static addBefore(actions: any, handler: any) {
    if (!Array.isArray(actions)) {
      actions = [actions]
    }
    actions.forEach((action: any) => {
      this.global.before[action] = this.global.before[action] || []
      this.global.before[action].push(handler)
    })
  }

  static addAfter(actions: any, handler: any) {
    if (!Array.isArray(actions)) {
      actions = [actions]
    }
    actions.forEach((action: any) => {
      this.global.after[action] = this.global.after[action] || []
      this.global.after[action].push(handler)
    })
  }

  static events = new EventEmmit()

  static repositories: Map<Connection, { [x: string]: Reposiory }> = new Map()

  static getRepository(connection: Connection, name: string) {
    return this.repositories.get(connection || defaultConnection)?.[name]
  }

  static registerRepository(connection: Connection, repository: Reposiory) {
    if (!this.repositories.get(connection)) {
      this.repositories.set(connection, {})
    }

    const mapForConnection = this.repositories.get(connection)
    mapForConnection[repository.name] = repository

    return true
  }

  get $events() {
    return Reposiory.events
  }

  constructor(connection?: Connection) {
    if (connection) this.connection = connection
  }

  getRef(key: string) {
    const type = this.schema.path(key)
    const isArray = (type as any).instance === 'Array'
    const ref = isArray
      ? (type as any)?.caster?.options?.ref
      : (type as any)?.options?.ref
    return { isArray, ref }
  }

  onInited() {}

  @Before(/.*/)
  baseBeforeAll(ctx: Context) {
    ctx.meta = ctx.meta || {}
  }

  @After('delete', 'deleteOne')
  async baseAfterDelete(ctx: ContextDelete<E>, rs: any) {
    for (const key of Object.keys(this.$cascade)) {
      if (!this.$cascade[key].delete) continue

      const { ref } = this.getRef(key)

      if (!ref) continue

      const refRepository = Reposiory.getRepository(
        this.connection,
        `${ref}Repository`
      )
      if (!refRepository) continue

      const ids: any[] = []

      ctx.meta.deleted.forEach((item: any) => {
        const value = item[key]
        if (Array.isArray(value)) {
          value.forEach((e: any) => {
            if (e && isValidObjectId(e)) {
              ids.push(e)
            }
          })
        } else if (value && isValidObjectId(value)) {
          ids.push(value)
        }
      })

      if (ids.length > 0) {
        await refRepository.delete({
          query: { _id: { $in: ids } },
          meta: { skipHook: true },
        })
      }
    }
    this.$events.emit(`${this.model.modelName}:delete`, ctx.meta.deleted)
    return rs
  }

  @Before(
    'list',
    'find',
    'findOne',
    'delete',
    'deleteOne',
    'update',
    'updateOne'
  )
  beforeBaseAction(ctx: Context & { query: any }) {
    if (ctx.query && ctx.query.id) {
      ctx.query._id = ctx.query.id
      delete ctx.query.id
    }
  }

  onCreateSchema(schema: Schema<E>): Schema<E> {
    return schema
  }

  $before: { [x: string]: string[] } = {}
  $after: { [x: string]: string[] } = {}
  $cascade: { [x: string]: CascadeOptions } = {}

  // Repository base actions
  @Action()
  findOne(ctx: FindOneContext<E> = {}) {
    const project =
      ctx.project || ctx.fields
        ? ctx.fields.reduce((val: any, field: any) => {
            val[field] = 1
            return val
          }, {})
        : undefined

    const queryBuilder = this.model.findOne(
      ctx.query,
      project,
      this.getBaseOptionFromContext(ctx)
    )

    if (ctx.populates) {
      for (const item of ctx.populates) {
        queryBuilder.populate(item)
      }
    }

    return queryBuilder.exec()
  }

  @Action()
  find(ctx: FindContext<E> = {}) {
    const project =
      ctx.project || ctx.fields
        ? ctx.fields.reduce((val: any, field: any) => {
            val[field] = 1
            return val
          }, {})
        : undefined

    const queryBuilder = this.model.find(
      ctx.query,
      project,
      this.getBaseOptionFromContext({
        ...ctx,
        limit: ctx.limit,
        skip: ctx.skip,
        sort: ctx.sort,
      })
    )

    if (ctx.populates) {
      for (const item of ctx.populates) {
        queryBuilder.populate(item)
      }
    }

    return queryBuilder.exec()
  }

  @Action()
  async list(ctx: ListContext<E> = {}) {
    const project =
      ctx.project || ctx.fields
        ? ctx.fields.reduce((val: any, field: any) => {
            val[field] = 1
            return val
          }, {})
        : undefined

    const limit = Number.isInteger(ctx.pageSize)
      ? ctx.pageSize
      : Number.isInteger(ctx.limit)
      ? ctx.limit
      : 10

    const skip = Number.isInteger(ctx.page)
      ? (ctx.page - 1) * limit
      : Number.isInteger(ctx.skip)
      ? ctx.skip
      : 0

    const queryBuilder = this.model.find(
      ctx.query,
      project,
      this.getBaseOptionFromContext({
        ...ctx,
        limit,
        skip,
        sort: ctx.sort,
      })
    )

    if (ctx.populates) {
      for (const item of ctx.populates) {
        queryBuilder.populate(item)
      }
    }

    const [docs, count] = await Promise.all([
      queryBuilder.exec(),
      queryBuilder.countDocuments(),
    ])

    return {
      data: docs,
      pageSize: limit,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(count / limit),
      total: count,
    }
  }

  async cascadeCreate(ctx: ContextCreate<E>) {
    const data: any = ctx.data

    for (const key of Object.keys(this.$cascade)) {
      if (!this.$cascade[key].create) continue
      const value = data[key]

      if (!value) {
        data[key] = null
        continue
      }

      const { isArray, ref } = this.getRef(key)

      if (!ref) continue

      const refRepository = Reposiory.getRepository(
        this.connection,
        ref + 'Repository'
      )

      if (!refRepository) continue

      if (isArray) {
        if (!Array.isArray(value)) {
          throw new Error(`${key} must be array`)
        }

        const arr: any[] = []

        for (let index = 0; index < value.length; index++) {
          const item = value[index]

          if (!item) {
            arr[index] = null
            continue
          }

          if (isValidObjectId(item)) {
            arr[index] = item
            continue
          }

          if (item.id) {
            arr[index] = item.id
            continue
          }

          if (item._id) {
            arr[index] = item._id
            continue
          }

          const doc = await refRepository.create(
            omitBy(
              {
                data: item,
                meta: {
                  skipHook: true,
                  cascadeContext: ctx.meta.cascadeContext,
                },
                session: ctx.session,
              },
              [null, undefined]
            ) as any
          )
          ctx.meta.cascadeContext.rollbacks.push(() => {
            data[key] = value
            return refRepository.model.deleteOne({ _id: doc._id })
          })
          arr[index] = doc._id
        }

        data[key] = arr
      } else {
        if (isValidObjectId(value)) continue

        if (value.id) {
          data[key] = value.id
          continue
        }

        if (value._id) {
          data[key] = value._id
          continue
        }

        const doc = await refRepository.create(
          omitBy(
            {
              data: value,
              meta: {
                skipHook: true,
                cascadeContext: ctx.meta.cascadeContext,
              },
              session: ctx.session,
            },
            [null, undefined]
          ) as any
        )

        ctx.meta.cascadeContext.rollbacks.push(() => {
          data[key] = value
          return refRepository.model.deleteOne({ _id: doc._id })
        })
        data[key] = doc._id
      }
    }
    // End cascade
  }

  @Action()
  async create(ctx: ContextCreate<E>) {
    // Cascade create
    const isExcecRollback = !ctx.meta?.cascadeContext
    if (!ctx.meta.cascadeContext) {
      ctx.meta.cascadeContext = {
        rollbacked: false,
        rollbacks: [],
      }
    }

    try {
      await this.cascadeCreate(ctx)
      const entity = new this.model(ctx.data)
      await entity.save(this.getBaseOptionFromContext(ctx))
      if (ctx.populates) {
        return this.findOne({
          query: { _id: entity._id },
          populates: ctx.populates,
          meta: {
            skipHook: true,
          },
        })
      } else {
        return entity
      }
    } catch (error) {
      if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
        await Promise.all(
          ctx.meta.cascadeContext.rollbacks.map((e: any) => e())
        )
        ctx.meta.cascadeContext.rollbacked = true
      }
      throw error
    }
  }

  @Action()
  async createMany(ctx: ContextCreateMany<E>) {
    // Cascade createMany
    const isExcecRollback = !ctx.meta?.cascadeContext
    if (!ctx.meta.cascadeContext) {
      ctx.meta.cascadeContext = {
        rollbacked: false,
        rollbacks: [],
      }
    }

    try {
      for (const item of ctx.data) {
        if (!item) continue
        await this.cascadeCreate({
          ...ctx,
          data: item,
        })
      }

      const docs = await this.model.insertMany(
        ctx.data as Array<E>,
        omitBy(
          {
            session: ctx.session,
            safe: ctx.safe,
            rawResult: false,
          },
          [null, undefined]
        )
      )

      if (ctx.populates) {
        return this.find({
          query: { _id: { $in: docs.map((e) => e._id) } },
          populates: ctx.populates,
          meta: {
            skipHook: true,
          },
        })
      } else {
        return docs
      }
    } catch (error) {
      if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
        await Promise.all(
          ctx.meta.cascadeContext.rollbacks.map((e: any) => e())
        )
        ctx.meta.cascadeContext.rollbacked = true
      }
      throw error
    }
  }

  async cascadeUpdate(ctx: ContextUpdate<E>) {
    const data: any = ctx.data
    for (const key of Object.keys(this.$cascade)) {
      if (!this.$cascade[key].update) continue
      const value = data[key]

      if (!value) {
        data[key] = null
        continue
      }

      const { isArray, ref } = this.getRef(key)

      if (!ref) continue

      const refRepository = Reposiory.getRepository(
        this.connection,
        ref + 'Repository'
      )

      if (!refRepository) continue

      if (isArray) {
        if (!Array.isArray(value)) {
          throw new Error(`${key} must be array`)
        }

        const arr: any[] = []

        for (let index = 0; index < value.length; index++) {
          const item = value[index]

          if (!item) {
            arr[index] = null
            continue
          }

          if (isValidObjectId(item)) {
            arr[index] = item
            continue
          }

          const id = item._id || item.id
          let oldValue: any
          if (id) {
            oldValue = await refRepository.model.findOne({ _id: id })
          }

          const doc = await refRepository.updateOne({
            query: {
              _id: id || new ObjectId(),
            },
            data: item,
            meta: {
              skipHook: true,
              cascadeContext: ctx.meta.cascadeContext,
            },
            session: ctx.session,
            upsert: true,
          })

          ctx.meta.cascadeContext.rollbacks.push(() => {
            data[key] = value
            if (id && oldValue) {
              return refRepository.model.updateOne({ _id: id }, oldValue)
            } else {
              return refRepository.model.deleteOne({ _id: doc._id })
            }
          })
          arr[index] = doc._id
        }

        data[key] = arr
      } else {
        if (isValidObjectId(value)) continue

        const id = value._id || value.id
        let oldValue: any
        if (id) {
          oldValue = await refRepository.model.findOne({ _id: id })
        }

        const doc = await refRepository.updateOne({
          query: { _id: id || new ObjectId() },
          data: value,
          meta: {
            skipHook: true,
            cascadeContext: ctx.meta.cascadeContext,
          },
          session: ctx.session,
          upsert: true,
        })

        ctx.meta.cascadeContext.rollbacks.push(() => {
          data[key] = value
          if (id && oldValue) {
            return refRepository.model.updateOne({ _id: id }, oldValue)
          } else {
            return refRepository.model.deleteOne({ _id: doc._id })
          }
        })
        data[key] = doc._id
      }
    }
  }

  @Action()
  async update(ctx: ContextUpdate<E>) {
    const isExcecRollback = !ctx.meta?.cascadeContext
    if (!ctx.meta.cascadeContext) {
      ctx.meta.cascadeContext = {
        rollbacked: false,
        rollbacks: [],
      }
    }
    try {
      await this.cascadeUpdate(ctx)
      return this.model
        .updateMany(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
        .then(() =>
          this.find({ ...ctx, meta: { ...ctx.meta, skipHook: true } })
        )
    } catch (error) {
      if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
        await Promise.all(
          ctx.meta.cascadeContext.rollbacks.map((e: any) => e())
        )
        ctx.meta.cascadeContext.rollbacked = true
      }
      throw error
    }
  }

  @Action()
  async updateOne(ctx: ContextUpdate<E>) {
    const isExcecRollback = !ctx.meta?.cascadeContext
    if (!ctx.meta.cascadeContext) {
      ctx.meta.cascadeContext = {
        rollbacked: false,
        rollbacks: [],
      }
    }

    try {
      await this.cascadeUpdate(ctx)
      return this.model
        .updateOne(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
        .then(() =>
          this.findOne({ ...ctx, meta: { ...ctx.meta, skipHook: true } })
        )
    } catch (error) {
      if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
        await Promise.all(
          ctx.meta.cascadeContext.rollbacks.map((e: any) => e())
        )
        ctx.meta.cascadeContext.rollbacked = true
      }
      throw error
    }
  }

  @Action()
  async delete(ctx: ContextDelete<E, {}>) {
    ctx.meta.deleted = await this.model.find(
      ctx.query,
      null,
      this.getBaseOptionFromContext(ctx)
    )
    return this.model
      .deleteMany(ctx.query, this.getBaseOptionFromContext(ctx))
      .then((rs) => rs.deletedCount)
  }

  @Action()
  async deleteOne(ctx: ContextDelete<E>) {
    ctx.meta.deleted = await this.model.find(
      ctx.query,
      null,
      this.getBaseOptionFromContext(ctx)
    )

    return this.model
      .deleteOne(ctx.query, this.getBaseOptionFromContext(ctx))
      .then((rs) => rs.deletedCount)
  }

  getBaseOptionFromContext<T extends object>(ctx: T): Partial<T> {
    const {
      fields,
      limit,
      skip,
      sort,
      populates,
      project,
      session,
      safe,
      upsert,
    } = ctx as any

    const options = {
      fields,
      limit,
      skip,
      sort,
      populates,
      project,
      session,
      safe,
      upsert,
    }

    const value = omitBy(options, [undefined, null])

    if (!Object.keys(value).length) {
      return undefined
    }

    return value as any
  }
}
