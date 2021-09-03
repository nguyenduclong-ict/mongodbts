"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repository = exports.Rollback = exports.Action = exports.After = exports.Before = exports.repository = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const events_1 = __importDefault(require("events"));
const lodash_1 = require("lodash");
const meta_1 = require("./meta");
const mongoose_1 = require("mongoose");
const constants_1 = require("./constants");
const schema_1 = require("./schema");
const utils_1 = require("./utils");
// @ts-ignore
function repository(EntityClass, connection, schema) {
    return function (constructor) {
        return class extends constructor {
            constructor(...args) {
                super(...args);
                this.entityCls = EntityClass;
                this.name = EntityClass.name;
                const actions = utils_1.getActions(constructor);
                const cascade = utils_1.getCascades(EntityClass);
                // const before = getHooks(KEYS.REPOSITORY_BEFORE, constructor)
                // const after = getHooks(KEYS.REPOSITORY_AFTER, constructor)
                const before = utils_1.getHooks('before', constructor);
                const after = utils_1.getHooks('after', constructor);
                this.$before = this.$before || {};
                this.$after = this.$after || {};
                Object.keys(Repository.global.before).forEach((key) => {
                    const handlers = Repository.global.before[key];
                    if (key.startsWith('/') && key.endsWith('/')) {
                        // is regex
                        const rg = new RegExp(key.slice(1, key.length - 1));
                        const matchs = actions.filter((action) => rg.test(action));
                        matchs.forEach((action) => {
                            this.$before[action] = this.$before[action] || [];
                            this.$before[action].push(...handlers);
                        });
                    }
                    else {
                        this.$before[key] = this.$before[key] || [];
                        this.$before[key].push(...handlers);
                    }
                });
                Object.keys(before).forEach((key) => {
                    const handlers = before[key];
                    if (key.startsWith('/') && key.endsWith('/')) {
                        // is regex
                        const rg = new RegExp(key.slice(1, key.length - 1));
                        const matchs = actions.filter((action) => rg.test(action));
                        matchs.forEach((action) => {
                            this.$before[action] = this.$before[action] || [];
                            this.$before[action].push(...handlers);
                        });
                    }
                    else {
                        this.$before[key] = this.$before[key] || [];
                        this.$before[key].push(...handlers);
                    }
                });
                Object.keys(after).forEach((key) => {
                    const handlers = after[key];
                    if (key.startsWith('/') && key.endsWith('/')) {
                        // is regex
                        const rg = new RegExp(key.slice(1, key.length - 1));
                        const matchs = actions.filter((action) => rg.test(action));
                        matchs.forEach((action) => {
                            this.$after[action] = this.$after[action] || [];
                            this.$after[action].push(...handlers);
                        });
                    }
                    else {
                        this.$after[key] = this.$after[key] || [];
                        this.$after[key].push(...handlers);
                    }
                });
                Object.keys(Repository.global.after).forEach((key) => {
                    const handlers = Repository.global.after[key];
                    if (key.startsWith('/') && key.endsWith('/')) {
                        // is regex
                        const rg = new RegExp(key.slice(1, key.length - 1));
                        const matchs = actions.filter((action) => rg.test(action));
                        matchs.forEach((action) => {
                            this.$after[action] = this.$after[action] || [];
                            this.$after[action].push(...handlers);
                        });
                    }
                    else {
                        this.$after[key] = this.$after[key] || [];
                        this.$after[key].push(...handlers);
                    }
                });
                // unique hooks
                Object.keys(this.$before).forEach((key) => {
                    this.$before[key] = lodash_1.uniq(this.$before[key]);
                });
                Object.keys(this.$after).forEach((key) => {
                    this.$after[key] = lodash_1.uniq(this.$after[key]);
                });
                this.schema = this.schema || schema || schema_1.createSchema(this.entityCls);
                if (this.onCreateSchema)
                    this.onCreateSchema(this.schema);
                this.connection = this.connection || connection || mongoose_1.connection;
                this.model =
                    this.connection.models[EntityClass.name] ||
                        this.connection.model(EntityClass.name, this.schema);
                this.$cascade = cascade;
                Repository.registerRepository(this.connection, this);
                this.baseOnInited();
                this.onInited();
            }
            baseOnInited() {
                for (const key in this.$cascade) {
                    const item = this.$cascade[key];
                    if (item.onDelete === 'null') {
                        const { isArray, ref } = this.getRef(key);
                        this.$events.addListener(`${ref}:delete`, (deleted = []) => __awaiter(this, void 0, void 0, function* () {
                            if (!deleted.length)
                                return;
                            const ids = deleted.map((e) => e._id);
                            return this.model.updateMany({
                                [key]: { $in: ids },
                            }, isArray
                                ? {
                                    $pullAll: {
                                        [key]: ids,
                                    },
                                }
                                : {
                                    [key]: null,
                                });
                        }));
                    }
                    if (item.onDelete === 'cascade') {
                        const { ref } = this.getRef(key);
                        this.$events.addListener(`${ref}:delete`, (deleted = []) => {
                            if (deleted.length)
                                return;
                            this.delete({
                                query: {
                                    [key]: { $in: deleted.map((e) => e._id) },
                                },
                                meta: {
                                    skipHook: true,
                                },
                            });
                        });
                    }
                }
            }
        };
    };
}
exports.repository = repository;
function Before(...actions) {
    return function (target, propertyKey) {
        const value = meta_1.hooks.before.get(target.constructor) || {};
        actions.forEach((action) => {
            if (!value[action])
                value[action] = [];
            if (!value[action].includes(propertyKey))
                value[action].push(propertyKey);
        });
        meta_1.hooks.before.set(target.constructor, value);
    };
}
exports.Before = Before;
function After(...actions) {
    return function (target, propertyKey) {
        const value = meta_1.hooks.after.get(target.constructor) || {};
        actions.forEach((action) => {
            if (!value[action])
                value[action] = [];
            if (!value[action].includes(propertyKey))
                value[action].push(propertyKey);
        });
        meta_1.hooks.after.set(target.constructor, value);
    };
}
exports.After = After;
function Action() {
    return function (target, propertyKey, descriptor) {
        const value = Reflect.getOwnMetadata(constants_1.KEYS.REPOSITORY_ACTIONS, target.constructor) || [];
        value.push(propertyKey);
        Reflect.defineMetadata(constants_1.KEYS.REPOSITORY_ACTIONS, value, target.constructor);
        const method = descriptor.value;
        descriptor.value = function (...args) {
            var _a, _b, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                const self = this;
                const skipHook = (_b = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.meta) === null || _b === void 0 ? void 0 : _b.skipHook;
                if (!skipHook) {
                    for (const name of self.$before[propertyKey] || []) {
                        if (typeof name === 'string') {
                            yield ((_c = self[name]) === null || _c === void 0 ? void 0 : _c.call(self, ...args));
                        }
                        else if (typeof name === 'function') {
                            yield name.call(self, ...args);
                        }
                    }
                }
                let result = yield method.call(self, ...args);
                if (!skipHook) {
                    for (const name of self.$after[propertyKey] || []) {
                        if (typeof name === 'string') {
                            result = yield ((_d = self[name]) === null || _d === void 0 ? void 0 : _d.call(self, ...args, result));
                        }
                        else if (typeof name === 'function') {
                            result = yield name.call(self, ...args, result);
                        }
                    }
                }
                return result;
            });
        };
    };
}
exports.Action = Action;
/**
 * Rollback
 */
class Rollback {
    constructor(options = {}) {
        this.actions = [];
        this.rollbacked = false;
        this.error = null;
        this.results = [];
        Object.assign(this, options);
    }
    add(action) {
        this.actions.push(action);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.rollbacked)
                return false;
            const start = this.error && this.errorIndex >= 0 ? this.errorIndex : 0;
            for (let index = start; index < this.actions.length; index++) {
                const action = this.actions[index];
                try {
                    this.results.push(yield action());
                }
                catch (error) {
                    this.errorIndex = error;
                    this.error = error;
                    throw error;
                }
            }
            this.rollbacked = true;
            return this.results.length === this.actions.length;
        });
    }
}
exports.Rollback = Rollback;
/**
 * Repository
 */
class Repository {
    constructor(connection) {
        this.options = {};
        this.$before = {};
        this.$after = {};
        this.$cascade = {};
        if (connection)
            this.connection = connection;
    }
    static addBefore(actions, handler) {
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        actions.forEach((action) => {
            this.global.before[action] = this.global.before[action] || [];
            this.global.before[action].push(handler);
        });
    }
    addBefore(actions, handler) {
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        actions.forEach((action) => {
            this.$before[action] = this.$before[action] || [];
            this.$before[action].push(handler);
        });
    }
    static addAfter(actions, handler) {
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        actions.forEach((action) => {
            this.global.after[action] = this.global.after[action] || [];
            this.global.after[action].push(handler);
        });
    }
    addAfter(actions, handler) {
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        actions.forEach((action) => {
            this.$after[action] = this.$after[action] || [];
            this.$after[action].push(handler);
        });
    }
    static getRepository(connection, name) {
        var _a;
        return (_a = this.repositories.get(connection || mongoose_1.connection)) === null || _a === void 0 ? void 0 : _a[name];
    }
    static getRepositories(connection) {
        return Object.values(this.repositories.get(connection || mongoose_1.connection) || {});
    }
    static registerRepository(connection, repository) {
        if (!this.repositories.get(connection)) {
            this.repositories.set(connection, {});
        }
        const mapForConnection = this.repositories.get(connection);
        mapForConnection[repository.name] = repository;
        return true;
    }
    get $events() {
        return Repository.events;
    }
    getRef(key) {
        var _a, _b, _c, _d, _e;
        const type = this.schema.path(key);
        const isArray = type.instance === 'Array';
        const ref = isArray
            ? (_c = (_b = (_a = type) === null || _a === void 0 ? void 0 : _a.caster) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.ref
            : (_e = (_d = type) === null || _d === void 0 ? void 0 : _d.options) === null || _e === void 0 ? void 0 : _e.ref;
        return { isArray, ref };
    }
    onInited() { }
    baseBeforeAll(ctx) {
        ctx.meta = ctx.meta || {};
        if (!Object.prototype.hasOwnProperty.call(ctx, 'cascade')) {
            ctx.cascade = true;
        }
    }
    baseAfterDelete(ctx, rs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ctx.cascade)
                return rs;
            for (const key of Object.keys(this.$cascade)) {
                if (!this.$cascade[key].delete)
                    continue;
                const { ref } = this.getRef(key);
                if (!ref)
                    continue;
                const refRepository = Repository.getRepository(this.connection, ref);
                if (!refRepository)
                    continue;
                const ids = [];
                ctx.meta.deleted.forEach((item) => {
                    const value = item[key];
                    if (Array.isArray(value)) {
                        value.forEach((e) => {
                            if (e && mongoose_1.isValidObjectId(e)) {
                                ids.push(e);
                            }
                        });
                    }
                    else if (value && mongoose_1.isValidObjectId(value)) {
                        ids.push(value);
                    }
                });
                if (ids.length > 0) {
                    yield refRepository.delete({
                        query: { _id: { $in: ids } },
                        meta: { skipHook: true },
                    });
                }
            }
            this.$events.emit(`${this.model.modelName}:delete`, ctx.meta.deleted);
            return rs;
        });
    }
    beforeBaseAction(ctx) {
        if (ctx.query && ctx.query.id) {
            ctx.query._id = ctx.query.id;
            delete ctx.query.id;
        }
    }
    getQueryProject(fields) {
        if (Array.isArray(fields)) {
            fields.reduce((val, field) => {
                val[field] = field.startsWith('-') ? 0 : 1;
                return val;
            }, {});
        }
        return fields;
    }
    onCreateSchema(schema) { }
    // Repository base actions
    findOne(ctx = {}) {
        const project = this.getQueryProject(ctx.project || ctx.fields);
        const queryBuilder = this.model.findOne(ctx.query, project, this.getBaseOptionFromContext(ctx, ['fields']));
        if (ctx.populates) {
            for (const item of ctx.populates) {
                queryBuilder.populate(item);
            }
        }
        return queryBuilder.exec();
    }
    find(ctx = {}) {
        const project = this.getQueryProject(ctx.project || ctx.fields);
        const queryBuilder = this.model.find(ctx.query, project, this.getBaseOptionFromContext(Object.assign(Object.assign({}, ctx), { limit: ctx.limit, skip: ctx.skip, sort: ctx.sort }), ['fields']));
        if (ctx.populates) {
            for (const item of ctx.populates) {
                queryBuilder.populate(item);
            }
        }
        return queryBuilder.exec();
    }
    list(ctx = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const project = this.getQueryProject(ctx.project || ctx.fields);
            const limit = Number.isInteger(ctx.pageSize)
                ? ctx.pageSize
                : Number.isInteger(ctx.limit)
                    ? ctx.limit
                    : 10;
            const skip = Number.isInteger(ctx.page)
                ? (ctx.page - 1) * limit
                : Number.isInteger(ctx.skip)
                    ? ctx.skip
                    : 0;
            const queryBuilder = this.model.find(ctx.query, project, this.getBaseOptionFromContext(Object.assign(Object.assign({}, ctx), { limit,
                skip, sort: ctx.sort }), ['fields']));
            if (ctx.populates) {
                for (const item of ctx.populates) {
                    queryBuilder.populate(item);
                }
            }
            const [docs, count] = yield Promise.all([
                queryBuilder.exec(),
                this.model.find(ctx.query).countDocuments(),
            ]);
            return {
                data: docs,
                pageSize: limit,
                page: Math.floor(skip / limit) + 1,
                totalPages: Math.ceil(count / limit),
                total: count,
            };
        });
    }
    cascadeCreate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = ctx.data;
            for (const key of Object.keys(this.$cascade)) {
                if (!this.$cascade[key].create)
                    continue;
                const value = data[key];
                if (!value) {
                    data[key] = null;
                    continue;
                }
                const { isArray, ref } = this.getRef(key);
                if (!ref)
                    continue;
                const refRepository = Repository.getRepository(this.connection, ref);
                if (!refRepository)
                    continue;
                if (isArray) {
                    if (!Array.isArray(value)) {
                        throw new Error(`${key} must be array`);
                    }
                    const arr = [];
                    for (let index = 0; index < value.length; index++) {
                        const item = value[index];
                        if (!item) {
                            arr[index] = null;
                            continue;
                        }
                        if (mongoose_1.isValidObjectId(item)) {
                            arr[index] = item;
                            continue;
                        }
                        if (item.id && mongoose_1.isValidObjectId(item.id)) {
                            arr[index] = item.id;
                            continue;
                        }
                        if (item._id && mongoose_1.isValidObjectId(item._id)) {
                            arr[index] = item._id;
                            continue;
                        }
                        const doc = yield refRepository.create(utils_1.omitBy(Object.assign({ data: item, meta: {
                                skipHook: true,
                            }, session: ctx.session }, this.getCascadeContext(ctx)), [null, undefined]));
                        ctx.rollback.add(() => {
                            data[key] = value;
                            return refRepository.model.deleteOne({ _id: doc._id });
                        });
                        arr[index] = doc._id;
                    }
                    data[key] = arr;
                }
                else {
                    if (mongoose_1.isValidObjectId(value))
                        continue;
                    if (value.id) {
                        data[key] = value.id;
                        continue;
                    }
                    if (value._id) {
                        data[key] = value._id;
                        continue;
                    }
                    const doc = yield refRepository.create(utils_1.omitBy(Object.assign(Object.assign({ data: value, meta: {
                            skipHook: true,
                        } }, this.getCascadeContext(ctx)), { session: ctx.session }), [null, undefined]));
                    ctx.rollback.add(() => {
                        data[key] = value;
                        return refRepository.model.deleteOne({ _id: doc._id });
                    });
                    data[key] = doc._id;
                }
            }
            // End cascade create
        });
    }
    create(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.query) {
                const exist = yield this.model.exists(ctx.query);
                if (exist)
                    throw new Error('Entity existed');
            }
            try {
                // check cascade
                if (this.getCascadeContext(ctx))
                    yield this.cascadeCreate(ctx);
                const entity = new this.model(ctx.data);
                yield entity.save(this.getBaseOptionFromContext(ctx));
                if (ctx.populates) {
                    return this.findOne({
                        query: { _id: entity._id },
                        populates: ctx.populates,
                        meta: {
                            skipHook: true,
                        },
                    });
                }
                else {
                    return entity;
                }
            }
            catch (error) {
                if (this.getCascadeContext(ctx) && ctx.execRollback) {
                    yield ctx.rollback.run();
                }
                throw error;
            }
        });
    }
    createMany(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.query) {
                const exist = yield this.model.exists(ctx.query);
                if (exist)
                    throw new Error('Entity existed');
            }
            // Cascade createMany
            try {
                if (this.getCascadeContext(ctx)) {
                    for (const item of ctx.data) {
                        if (!item)
                            continue;
                        if (ctx.cascade) {
                            yield this.cascadeCreate(Object.assign(Object.assign({}, ctx), { execRollback: false, data: item }));
                        }
                    }
                }
                const docs = yield this.model.insertMany(ctx.data, utils_1.omitBy({
                    session: ctx.session,
                    safe: ctx.safe,
                    rawResult: false,
                }, [null, undefined]));
                if (ctx.populates) {
                    return this.find({
                        query: { _id: { $in: docs.map((e) => e._id) } },
                        populates: ctx.populates,
                        meta: {
                            skipHook: true,
                        },
                    });
                }
                else {
                    return docs;
                }
            }
            catch (error) {
                if (this.getCascadeContext(ctx) && ctx.execRollback) {
                    yield ctx.rollback.run();
                }
                throw error;
            }
        });
    }
    cascadeUpdate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = ctx.data;
            for (const key of Object.keys(this.$cascade)) {
                if (!this.$cascade[key].update)
                    continue;
                const value = data[key];
                if (!value) {
                    data[key] = null;
                    continue;
                }
                const { isArray, ref } = this.getRef(key);
                if (!ref)
                    continue;
                const refRepository = Repository.getRepository(this.connection, ref);
                if (!refRepository)
                    continue;
                const updater = {};
                if (isArray) {
                    const newDatas = Array.isArray(value) ? value : [value];
                    for (let index = 0; index < newDatas.length; index++) {
                        const item = newDatas[index];
                        // create or update item
                        if (mongoose_1.isValidObjectId(item)) {
                            lodash_1.set(updater, `${key}.${index}`, item || null);
                        }
                        if (typeof item === 'object' &&
                            utils_1.toMongoId(item) &&
                            mongoose_1.isValidObjectId(utils_1.toMongoId(item))) {
                            // update
                            const oldValue = yield refRepository.model.findOne({
                                _id: utils_1.toMongoId(item),
                            });
                            const doc = yield refRepository.updateOne(utils_1.omitBy(Object.assign(Object.assign({ query: { _id: utils_1.toMongoId(item) }, data: lodash_1.omit(item, 'id', '_id'), meta: {
                                    skipHook: true,
                                } }, this.getCascadeContext(ctx)), { session: ctx.session }), [undefined, null]));
                            ctx.rollback.add(() => {
                                return refRepository.model.updateOne({ _id: utils_1.toMongoId(item) }, oldValue);
                            });
                            lodash_1.set(updater, `${key}.[${index}]`, utils_1.toMongoId(item));
                        }
                        else {
                            // create
                            const doc = yield refRepository.create(utils_1.omitBy(Object.assign(Object.assign({ data: item, meta: {
                                    skipHook: true,
                                } }, this.getCascadeContext(ctx)), { session: ctx.session }), [undefined, null]));
                            ctx.rollback.add(() => refRepository.model.deleteOne({ _id: utils_1.toMongoId(doc) }));
                            lodash_1.set(updater, `${key}.[${index}]`, utils_1.toMongoId(doc));
                        }
                    }
                }
                else {
                    const item = Array.isArray(value) ? value[0] : value;
                    if (mongoose_1.isValidObjectId(item)) {
                        lodash_1.set(updater, `${key}`, item || null);
                    }
                    if (typeof item === 'object' &&
                        utils_1.toMongoId(item) &&
                        mongoose_1.isValidObjectId(utils_1.toMongoId(item))) {
                        const oldValue = yield refRepository.model.findOne({
                            _id: utils_1.toMongoId(item),
                        });
                        // update
                        yield refRepository.updateOne(utils_1.omitBy(Object.assign(Object.assign({ query: { id: utils_1.toMongoId(item) }, data: lodash_1.omit(item, 'id', '_id'), meta: {
                                skipHook: true,
                            } }, this.getCascadeContext(ctx)), { session: ctx.session }), [undefined, null]));
                        ctx.rollback.add(() => refRepository.model.updateOne({ _id: utils_1.toMongoId(item) }, oldValue));
                        lodash_1.set(updater, `${key}`, utils_1.toMongoId(item));
                    }
                    else {
                        // create
                        const doc = yield refRepository.create(utils_1.omitBy(Object.assign(Object.assign({ data: item, meta: {
                                skipHook: true,
                            } }, this.getCascadeContext(ctx)), { session: ctx.session }), [undefined, null]));
                        ctx.rollback.add(() => refRepository.model.deleteOne({ _id: utils_1.toMongoId(doc) }));
                        lodash_1.set(updater, `${key}`, utils_1.toMongoId(doc));
                    }
                }
                lodash_1.unset(data, key);
                if (data.$set)
                    Object.assign(data.$set, updater);
                else
                    data.$set = updater;
            }
        });
    }
    update(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.getCascadeContext(ctx))
                    yield this.cascadeUpdate(ctx);
                return this.model
                    .updateMany(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
                    .then(() => this.find(Object.assign(Object.assign({}, ctx), { meta: Object.assign(Object.assign({}, ctx.meta), { skipHook: true }) })));
            }
            catch (error) {
                if (this.getCascadeContext(ctx) && ctx.execRollback) {
                    yield ctx.rollback.run();
                }
                throw error;
            }
        });
    }
    updateOne(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.getCascadeContext(ctx))
                    yield this.cascadeUpdate(ctx);
                return this.model
                    .updateOne(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
                    .then(() => this.findOne(Object.assign(Object.assign({}, ctx), { meta: Object.assign(Object.assign({}, ctx.meta), { skipHook: true }) })));
            }
            catch (error) {
                if (this.getCascadeContext(ctx) && ctx.execRollback) {
                    yield ctx.rollback.run();
                }
                throw error;
            }
        });
    }
    getCascadeContext(ctx) {
        if (!ctx.cascade)
            return null;
        if (!ctx.rollback) {
            ctx.rollback = new Rollback();
            ctx.execRollback = true;
        }
        return {
            cascade: ctx.cascade,
            rollback: ctx.rollback,
            execRollback: ctx.execRollback,
        };
    }
    delete(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            ctx.meta.deleted = yield this.model.find(ctx.query, null, this.getBaseOptionFromContext(ctx));
            return this.model
                .deleteMany(ctx.query, this.getBaseOptionFromContext(ctx))
                .then((rs) => rs.deletedCount);
        });
    }
    deleteOne(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            ctx.meta.deleted = yield this.model.find(ctx.query, null, this.getBaseOptionFromContext(ctx));
            return this.model
                .deleteOne(ctx.query, this.getBaseOptionFromContext(ctx))
                .then((rs) => rs.deletedCount);
        });
    }
    getBaseOptionFromContext(ctx, excludes = []) {
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
        ].filter((fields) => !excludes.includes(fields));
        const options = utils_1.pick(ctx, ...fields);
        const value = utils_1.omitBy(options, [undefined, null]);
        if (!Object.keys(value).length) {
            return undefined;
        }
        return value;
    }
    validate(data) {
        const entity = class_transformer_1.plainToClass(this.entityCls, data);
        return class_validator_1.validate(entity);
    }
}
Repository.global = {
    before: {},
    after: {},
};
Repository.events = new events_1.default();
Repository.repositories = new Map();
__decorate([
    Before(/.*/),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Repository.prototype, "baseBeforeAll", null);
__decorate([
    After('delete', 'deleteOne'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "baseAfterDelete", null);
__decorate([
    Before('list', 'find', 'findOne', 'delete', 'deleteOne', 'update', 'updateOne'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Repository.prototype, "beforeBaseAction", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Repository.prototype, "findOne", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Repository.prototype, "find", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "list", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "create", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "createMany", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "update", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "updateOne", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "delete", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Repository.prototype, "deleteOne", null);
exports.Repository = Repository;
