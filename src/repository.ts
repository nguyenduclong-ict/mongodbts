import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import EventEmmit from 'events'
import { omit, set, unset } from 'lodash'
import {
  AnyObject,
  Connection,
  connection as defaultConnection,
  FilterQuery,
  isValidObjectId,
  Model,
  PopulateOptions,
  Schema,
  UpdateQuery,
} from 'mongoose'
import { KEYS } from './constants'
import { CascadeOptions, createSchema } from './schema'
import {
  getActions,
  getCascades,
  getHooks,
  omitBy,
  pick,
  toMongoId,
} from './utils'

// <==== decorators
export type Constructor<T = {}> = new (...args: any[]) => T

// @ts-ignore
export function repository(
  EntityClass: any,
  connection?: Connection,
  schema?: Schema
) {
  return function <T extends Constructor<Repository<typeof EntityClass>>>(
    constructor: T
  ) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args)
        this.entityCls = EntityClass
        this.name = EntityClass.name
        const actions: string[] = getActions(constructor)
        const cascade = getCascades(EntityClass)
        const before = getHooks(KEYS.REPOSITORY_BEFORE, constructor)
        const after = getHooks(KEYS.REPOSITORY_AFTER, constructor)

        this.$before = this.$before || {}
        this.$after = this.$after || {}

        Object.keys(Repository.global.before).forEach((key) => {
          const handlers = Repository.global.before[key]
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

        Object.keys(Repository.global.after).forEach((key) => {
          const handlers = Repository.global.after[key]
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

        this.schema =
          this.schema ||
          schema ||
          this.onCreateSchema(createSchema(EntityClass))
        this.connection = this.connection || connection || defaultConnection
        this.model =
          this.connection.models[EntityClass.name] ||
          this.connection.model(EntityClass.name, this.schema)
        this.$cascade = cascade

        Repository.registerRepository(this.connection, this)
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
  return function (target: Repository, propertyKey: string) {
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
  return function (target: Repository, propertyKey: string) {
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
    target: Repository,
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
  meta?: M & Mongodbts.BaseMeta
}

/** FindOne Context */
export interface ContextOptions<E> {
  project?: { [K in keyof E]: 0 | 1 } & { [x: string]: 0 | 1 }
  fields?: (keyof E | (string & {}))[]
  sort?: { [K in keyof E]: 0 | 1 } & { [x: string]: 0 | 1 }
  populates?: (keyof E | (string & {}) | PopulateOptions)[]
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

interface CascadeContext {
  rollback?: Rollback
  execRollback?: boolean
  cascade?: boolean
}

/** Create Context */
export interface CreateContext<E = any, M = AnyObject>
  extends Context<M>,
    CascadeContext {
  // Query for check existed, if set then check entity existed with query before
  // If Exist throw error
  query?: FilterQuery<E>
  data: E
  session?: any
  safe?: boolean
  populates?: (keyof E)[] | Array<PopulateOptions>
}

/** CreateMany Context */
export interface CreateContextMany<E = any, M = AnyObject>
  extends Context<M>,
    ContextOptions<E>,
    CascadeContext {
  // Query for check existed, if set then check entity existed with query before
  // If Exist throw error
  query?: FilterQuery<E>
  data: E[]
  safe?: boolean
  session?: any
  populates?: (keyof E)[] | Array<PopulateOptions>
}

/** Update Context */
export interface UpdateContext<E = any, M = AnyObject>
  extends Context<M>,
    ContextOptions<E>,
    CascadeContext {
  query: FilterQuery<E>
  data: UpdateQuery<E>
  upsert?: boolean
  populates?: (keyof E)[] | Array<PopulateOptions>
}

/** Delete Context */
export interface DeleteContext<E = any, M = {}>
  extends Context<M>,
    ContextOptions<E>,
    CascadeContext {
  query: FilterQuery<E>
}

/**
 * Rollback
 */
export class Rollback {
  actions: any[] = []
  rollbacked = false
  error: any = null
  results: any[] = []
  errorIndex: number

  constructor(options: Partial<Rollback> = {}) {
    Object.assign(this, options)
  }

  add(action: any) {
    this.actions.push(action)
  }

  async run() {
    if (this.rollbacked) return false

    const start = this.error && this.errorIndex >= 0 ? this.errorIndex : 0

    for (let index = start; index < this.actions.length; index++) {
      const action = this.actions[index]
      try {
        this.results.push(await action())
      } catch (error) {
        this.errorIndex = error
        this.error = error
        throw error
      }
    }

    this.rollbacked = true

    return this.results.length === this.actions.length
  }
}
/**
 * Repository
 */
export class Repository<E = any> {
  name: string
  model: Model<E>
  schema: Schema<E>
  connection: Connection
  entityCls: E
  options: Mongodbts.BaseOptions = {} as any

  $before: { [x: string]: string[] } = {}
  $after: { [x: string]: string[] } = {}
  $cascade: { [x: string]: CascadeOptions } = {}

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

  addBefore(actions: any, handler: any) {
    if (!Array.isArray(actions)) {
      actions = [actions]
    }
    actions.forEach((action: any) => {
      this.$before[action] = this.$before[action] || []
      this.$before[action].push(handler)
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

  addAfter(actions: any, handler: any) {
    if (!Array.isArray(actions)) {
      actions = [actions]
    }
    actions.forEach((action: any) => {
      this.$after[action] = this.$after[action] || []
      this.$after[action].push(handler)
    })
  }

  static events = new EventEmmit()

  static repositories: Map<Connection, { [x: string]: Repository }> = new Map()

  static getRepository(connection: Connection, name: string) {
    return this.repositories.get(connection || defaultConnection)?.[name]
  }

  static registerRepository(connection: Connection, repository: Repository) {
    if (!this.repositories.get(connection)) {
      this.repositories.set(connection, {})
    }

    const mapForConnection = this.repositories.get(connection)
    mapForConnection[repository.name] = repository

    return true
  }

  get $events() {
    return Repository.events
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
  baseBeforeAll(ctx: Context & CascadeContext) {
    ctx.meta = ctx.meta || {}
    if (!Object.prototype.hasOwnProperty.call(ctx, 'cascade')) {
      ctx.cascade = true
    }
  }

  @After('delete', 'deleteOne')
  async baseAfterDelete(ctx: DeleteContext<E>, rs: any) {
    if (!ctx.cascade) return rs
    for (const key of Object.keys(this.$cascade)) {
      if (!this.$cascade[key].delete) continue

      const { ref } = this.getRef(key)

      if (!ref) continue

      const refRepository = Repository.getRepository(this.connection, ref)
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
  beforeBaseAction(ctx: Context & CascadeContext & { query: any }) {
    if (ctx.query && ctx.query.id) {
      ctx.query._id = ctx.query.id
      delete ctx.query.id
    }
  }

  onCreateSchema(schema: Schema<E>): Schema<E> {
    return schema
  }

  getQueryProject(fields: object | (keyof E)[]) {
    if (Array.isArray(fields)) {
      fields.reduce((val: any, field: any) => {
        val[field] = field.startsWith('-') ? 0 : 1
        return val
      }, {})
    }
    return fields
  }

  // Repository base actions
  @Action()
  findOne(ctx: FindOneContext<E> = {}) {
    const project = this.getQueryProject(ctx.project || ctx.fields)

    const queryBuilder = this.model.findOne(
      ctx.query,
      project,
      this.getBaseOptionFromContext(ctx, ['fields'])
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
    const project = this.getQueryProject(ctx.project || ctx.fields)

    const queryBuilder = this.model.find(
      ctx.query,
      project,
      this.getBaseOptionFromContext(
        {
          ...ctx,
          limit: ctx.limit,
          skip: ctx.skip,
          sort: ctx.sort,
        },
        ['fields']
      )
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
    const project = this.getQueryProject(ctx.project || ctx.fields)

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
      this.getBaseOptionFromContext(
        {
          ...ctx,
          limit,
          skip,
          sort: ctx.sort,
        },
        ['fields']
      )
    )

    if (ctx.populates) {
      for (const item of ctx.populates) {
        queryBuilder.populate(item)
      }
    }

    const [docs, count] = await Promise.all([
      queryBuilder.exec(),
      this.model.find().merge(queryBuilder).countDocuments(),
    ])

    return {
      data: docs,
      pageSize: limit,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(count / limit),
      total: count,
    }
  }

  async cascadeCreate(ctx: CreateContext<E>) {
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

      const refRepository = Repository.getRepository(this.connection, ref)

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

          if (item.id && isValidObjectId(item.id)) {
            arr[index] = item.id
            continue
          }

          if (item._id && isValidObjectId(item._id)) {
            arr[index] = item._id
            continue
          }

          const doc = await refRepository.create(
            omitBy(
              {
                data: item,
                meta: {
                  skipHook: true,
                },
                session: ctx.session,
                ...this.getCascadeContext(ctx),
              },
              [null, undefined]
            ) as any
          )

          ctx.rollback.add(() => {
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
              },
              ...this.getCascadeContext(ctx),
              session: ctx.session,
            },
            [null, undefined]
          ) as any
        )

        ctx.rollback.add(() => {
          data[key] = value
          return refRepository.model.deleteOne({ _id: doc._id })
        })
        data[key] = doc._id
      }
    }
    // End cascade create
  }

  @Action()
  async create(ctx: CreateContext<E>) {
    if (ctx.query) {
      const exist = await this.model.exists(ctx.query)
      if (exist) throw new Error('Entity existed')
    }
    try {
      // check cascade
      if (this.getCascadeContext(ctx)) await this.cascadeCreate(ctx)
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
      if (this.getCascadeContext(ctx) && ctx.execRollback) {
        await ctx.rollback.run()
      }
      throw error
    }
  }

  @Action()
  async createMany(ctx: CreateContextMany<E>) {
    if (ctx.query) {
      const exist = await this.model.exists(ctx.query)
      if (exist) throw new Error('Entity existed')
    }

    // Cascade createMany
    try {
      if (this.getCascadeContext(ctx)) {
        for (const item of ctx.data) {
          if (!item) continue
          if (ctx.cascade) {
            await this.cascadeCreate({
              ...ctx,
              execRollback: false,
              data: item,
            })
          }
        }
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
      if (this.getCascadeContext(ctx) && ctx.execRollback) {
        await ctx.rollback.run()
      }
      throw error
    }
  }

  async cascadeUpdate(ctx: UpdateContext<E>) {
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

      const refRepository = Repository.getRepository(this.connection, ref)

      if (!refRepository) continue

      const updater = {}

      if (isArray) {
        const newDatas = Array.isArray(value) ? value : [value]
        for (let index = 0; index < newDatas.length; index++) {
          const item = newDatas[index]
          // create or update item
          if (isValidObjectId(item)) {
            set(updater, `${key}.${index}`, item || null)
          }

          if (
            typeof item === 'object' &&
            toMongoId(item) &&
            isValidObjectId(toMongoId(item))
          ) {
            // update
            const oldValue = await refRepository.model.findOne({
              _id: toMongoId(item),
            })

            const doc = await refRepository.updateOne(
              omitBy(
                {
                  query: { _id: toMongoId(item) },
                  data: omit(item, 'id', '_id'),
                  meta: {
                    skipHook: true,
                  },
                  ...this.getCascadeContext(ctx),
                  session: ctx.session,
                },
                [undefined, null]
              ) as any
            )

            ctx.rollback.add(() => {
              return refRepository.model.updateOne(
                { _id: toMongoId(item) },
                oldValue
              )
            })

            set(updater, `${key}.[${index}]`, toMongoId(item))
          } else {
            // create
            const doc = await refRepository.create(
              omitBy(
                {
                  data: item,
                  meta: {
                    skipHook: true,
                  },
                  ...this.getCascadeContext(ctx),
                  session: ctx.session,
                },
                [undefined, null]
              ) as any
            )

            ctx.rollback.add(() =>
              refRepository.model.deleteOne({ _id: toMongoId(doc) })
            )

            set(updater, `${key}.[${index}]`, toMongoId(doc))
          }
        }
      } else {
        const item = Array.isArray(value) ? value[0] : value
        if (isValidObjectId(item)) {
          set(updater, `${key}`, item || null)
        }

        if (
          typeof item === 'object' &&
          toMongoId(item) &&
          isValidObjectId(toMongoId(item))
        ) {
          const oldValue = await refRepository.model.findOne({
            _id: toMongoId(item),
          })
          // update
          await refRepository.updateOne(
            omitBy(
              {
                query: { id: toMongoId(item) },
                data: omit(item, 'id', '_id'),
                meta: {
                  skipHook: true,
                },
                ...this.getCascadeContext(ctx),
                session: ctx.session,
              },
              [undefined, null]
            ) as any
          )

          ctx.rollback.add(() =>
            refRepository.model.updateOne({ _id: toMongoId(item) }, oldValue)
          )

          set(updater, `${key}`, toMongoId(item))
        } else {
          // create
          const doc = await refRepository.create(
            omitBy(
              {
                data: item,
                meta: {
                  skipHook: true,
                },
                ...this.getCascadeContext(ctx),
                session: ctx.session,
              },
              [undefined, null]
            ) as any
          )

          ctx.rollback.add(() =>
            refRepository.model.deleteOne({ _id: toMongoId(doc) })
          )

          set(updater, `${key}`, toMongoId(doc))
        }
      }

      unset(data, key)
      if (data.$set) Object.assign(data.$set, updater)
      else data.$set = updater
    }
  }

  @Action()
  async update(ctx: UpdateContext<E>) {
    try {
      if (this.getCascadeContext(ctx)) await this.cascadeUpdate(ctx)
      return this.model
        .updateMany(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
        .then(() =>
          this.find({ ...ctx, meta: { ...ctx.meta, skipHook: true } })
        )
    } catch (error) {
      if (this.getCascadeContext(ctx) && ctx.execRollback) {
        await ctx.rollback.run()
      }
      throw error
    }
  }

  @Action()
  async updateOne(ctx: UpdateContext<E>) {
    try {
      if (this.getCascadeContext(ctx)) await this.cascadeUpdate(ctx)
      return this.model
        .updateOne(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
        .then(() =>
          this.findOne({ ...ctx, meta: { ...ctx.meta, skipHook: true } })
        )
    } catch (error) {
      if (this.getCascadeContext(ctx) && ctx.execRollback) {
        await ctx.rollback.run()
      }
      throw error
    }
  }

  getCascadeContext(ctx: Context<CascadeContext> & CascadeContext) {
    if (!ctx.cascade) return null
    if (!ctx.rollback) {
      ctx.rollback = new Rollback()
      ctx.execRollback = true
    }
    return {
      cascade: ctx.cascade,
      rollback: ctx.rollback,
      execRollback: ctx.execRollback,
    }
  }

  @Action()
  async delete(ctx: DeleteContext<E, {}>) {
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
  async deleteOne(ctx: DeleteContext<E>) {
    ctx.meta.deleted = await this.model.find(
      ctx.query,
      null,
      this.getBaseOptionFromContext(ctx)
    )

    return this.model
      .deleteOne(ctx.query, this.getBaseOptionFromContext(ctx))
      .then((rs) => rs.deletedCount)
  }

  getBaseOptionFromContext<T extends object>(
    ctx: T,
    excludes: string[] = []
  ): Partial<T> {
    const fields = [
      'fields',
      'limit',
      'skip',
      'sort',
      'populates',
      'project',
      'session',
      'safe',
      'upsert',
    ].filter((fields) => !excludes.includes(fields))

    const options = pick(ctx, ...fields)

    const value = omitBy(options, [undefined, null])

    if (!Object.keys(value).length) {
      return undefined
    }

    return value as any
  }

  validate(data: E | undefined | AnyObject) {
    const entity = plainToClass(this.entityCls as any, data)
    return validate(entity as any)
  }
}
