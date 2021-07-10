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
exports.Reposiory = exports.Action = exports.After = exports.Before = exports.repository = void 0;
const mongoose_1 = require("mongoose");
const mongodb_1 = require("mongodb");
const constants_1 = require("./constants");
const schema_1 = require("./schema");
const utils_1 = require("./utils");
const events_1 = __importDefault(require("events"));
// @ts-ignore
function repository(EntityClass, connection) {
    return function (constructor) {
        return class extends constructor {
            constructor(...args) {
                super(...args);
                this.name = constructor.name;
                const actions = utils_1.getActions(constructor);
                const cascade = utils_1.getCascades(EntityClass);
                const before = utils_1.getHooks(constants_1.KEYS.REPOSITORY_BEFORE, constructor);
                const after = utils_1.getHooks(constants_1.KEYS.REPOSITORY_AFTER, constructor);
                this.$before = this.$before || {};
                this.$after = this.$after || {};
                Object.keys(Reposiory.global.before).forEach((key) => {
                    const handlers = Reposiory.global.before[key];
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
                Object.keys(Reposiory.global.after).forEach((key) => {
                    const handlers = Reposiory.global.after[key];
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
                this.schema = this.onCreateSchema(schema_1.createSchema(EntityClass));
                this.connection = this.connection || connection || mongoose_1.connection;
                this.model =
                    this.connection.models[EntityClass.name] ||
                        this.connection.model(EntityClass.name, this.schema);
                this.$cascade = cascade;
                Reposiory.registerRepository(this.connection, this);
                this.baseOnInited();
                this.onInited();
            }
            baseOnInited() {
                for (const key in this.$cascade) {
                    const item = this.$cascade[key];
                    if (item.onDelete === 'null') {
                        this.$events.addListener(`${key}:delete`, (deleted = []) => {
                            if (deleted.length)
                                return;
                            this.model.updateMany({
                                [key]: { $in: deleted.map((e) => e._id) },
                            }, {
                                [key]: null,
                            });
                        });
                    }
                    if (item.onDelete === 'cascade') {
                        this.$events.addListener(`${key}:delete`, (deleted = []) => {
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
        const value = Reflect.getOwnMetadata(constants_1.KEYS.REPOSITORY_BEFORE, target.constructor) || {};
        actions.forEach((action) => {
            if (!value[action])
                value[action] = [];
            value[action].push(propertyKey);
        });
        Reflect.defineMetadata(constants_1.KEYS.REPOSITORY_BEFORE, value, target.constructor);
    };
}
exports.Before = Before;
function After(...actions) {
    return function (target, propertyKey) {
        const value = Reflect.getOwnMetadata(constants_1.KEYS.REPOSITORY_AFTER, target.constructor) || {};
        actions.forEach((action) => {
            if (!value[action])
                value[action] = [];
            value[action].push(propertyKey);
        });
        Reflect.defineMetadata(constants_1.KEYS.REPOSITORY_AFTER, value, target.constructor);
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
 * Repository
 */
class Reposiory {
    constructor(connection) {
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
    static addAfter(actions, handler) {
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        actions.forEach((action) => {
            this.global.after[action] = this.global.after[action] || [];
            this.global.after[action].push(handler);
        });
    }
    static getRepository(connection, name) {
        var _a;
        return (_a = this.repositories.get(connection || mongoose_1.connection)) === null || _a === void 0 ? void 0 : _a[name];
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
        return Reposiory.events;
    }
    onInited() { }
    baseBeforeAll(ctx) {
        ctx.meta = ctx.meta || {};
    }
    baseAfterDelete(ctx, rs) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const key of Object.keys(this.$cascade)) {
                if (!this.$cascade[key].delete)
                    continue;
                const refRepository = Reposiory.getRepository(this.connection, `${key}Repository`);
                if (!refRepository)
                    continue;
                const ids = ctx.meta.deleted
                    .map((item) => item[key])
                    .filter((e) => e && mongoose_1.isValidObjectId(e));
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
    onCreateSchema(schema) {
        return schema;
    }
    // Repository base actions
    findOne(ctx = {}) {
        const project = ctx.project || ctx.fields
            ? ctx.fields.reduce((val, field) => {
                val[field] = 1;
                return val;
            }, {})
            : undefined;
        const queryBuilder = this.model.findOne(ctx.query, project, this.getBaseOptionFromContext(ctx));
        if (ctx.populates) {
            for (const item of ctx.populates) {
                queryBuilder.populate(item);
            }
        }
        return queryBuilder.exec();
    }
    find(ctx = {}) {
        const project = ctx.project || ctx.fields
            ? ctx.fields.reduce((val, field) => {
                val[field] = 1;
                return val;
            }, {})
            : undefined;
        const queryBuilder = this.model.find(ctx.query, project, this.getBaseOptionFromContext(Object.assign(Object.assign({}, ctx), { limit: ctx.limit, skip: ctx.skip, sort: ctx.sort })));
        if (ctx.populates) {
            for (const item of ctx.populates) {
                queryBuilder.populate(item);
            }
        }
        return queryBuilder.exec();
    }
    list(ctx = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const project = ctx.project || ctx.fields
                ? ctx.fields.reduce((val, field) => {
                    val[field] = 1;
                    return val;
                }, {})
                : undefined;
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
                skip, sort: ctx.sort })));
            if (ctx.populates) {
                for (const item of ctx.populates) {
                    queryBuilder.populate(item);
                }
            }
            const [docs, count] = yield Promise.all([
                queryBuilder.exec(),
                queryBuilder.countDocuments(),
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
        var _a, _b, _c, _d, _e;
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
                const type = this.schema.path(key);
                const isArray = type.instance === 'Array';
                const ref = isArray
                    ? (_c = (_b = (_a = type) === null || _a === void 0 ? void 0 : _a.caster) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.ref
                    : (_e = (_d = type) === null || _d === void 0 ? void 0 : _d.options) === null || _e === void 0 ? void 0 : _e.ref;
                if (!ref)
                    continue;
                const refRepository = Reposiory.getRepository(this.connection, ref + 'Repository');
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
                        if (item.id) {
                            arr[index] = item.id;
                            continue;
                        }
                        if (item._id) {
                            arr[index] = item._id;
                            continue;
                        }
                        const doc = yield refRepository.create(utils_1.omitBy({
                            data: item,
                            meta: {
                                skipHook: true,
                                cascadeContext: ctx.meta.cascadeContext,
                            },
                            session: ctx.session,
                        }, [null, undefined]));
                        ctx.meta.cascadeContext.rollbacks.push(() => {
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
                    const doc = yield refRepository.create(utils_1.omitBy({
                        data: value,
                        meta: {
                            skipHook: true,
                            cascadeContext: ctx.meta.cascadeContext,
                        },
                        session: ctx.session,
                    }, [null, undefined]));
                    ctx.meta.cascadeContext.rollbacks.push(() => {
                        data[key] = value;
                        return refRepository.model.deleteOne({ _id: doc._id });
                    });
                    data[key] = doc._id;
                }
            }
        });
    }
    create(ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Cascade create
            const isExcecRollback = !((_a = ctx.meta) === null || _a === void 0 ? void 0 : _a.cascadeContext);
            if (!ctx.meta.cascadeContext) {
                ctx.meta.cascadeContext = {
                    rollbacked: false,
                    rollbacks: [],
                };
            }
            try {
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
                if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
                    yield Promise.all(ctx.meta.cascadeContext.rollbacks.map((e) => e()));
                    ctx.meta.cascadeContext.rollbacked = true;
                }
                throw error;
            }
        });
    }
    createMany(ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Cascade createMany
            const isExcecRollback = !((_a = ctx.meta) === null || _a === void 0 ? void 0 : _a.cascadeContext);
            if (!ctx.meta.cascadeContext) {
                ctx.meta.cascadeContext = {
                    rollbacked: false,
                    rollbacks: [],
                };
            }
            try {
                for (const item of ctx.data) {
                    if (!item)
                        continue;
                    yield this.cascadeCreate(Object.assign(Object.assign({}, ctx), { data: item }));
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
                if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
                    yield Promise.all(ctx.meta.cascadeContext.rollbacks.map((e) => e()));
                    ctx.meta.cascadeContext.rollbacked = true;
                }
                throw error;
            }
        });
    }
    cascadeUpdate(ctx) {
        var _a, _b, _c, _d, _e;
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
                const type = this.schema.path(key);
                const isArray = type.instance === 'Array';
                const ref = isArray
                    ? (_c = (_b = (_a = type) === null || _a === void 0 ? void 0 : _a.caster) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.ref
                    : (_e = (_d = type) === null || _d === void 0 ? void 0 : _d.options) === null || _e === void 0 ? void 0 : _e.ref;
                if (!ref)
                    continue;
                const refRepository = Reposiory.getRepository(this.connection, ref + 'Repository');
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
                        const id = item._id || item.id;
                        let oldValue;
                        if (id) {
                            oldValue = yield refRepository.model.findOne({ _id: id });
                        }
                        const doc = yield refRepository.updateOne({
                            query: {
                                _id: id || new mongodb_1.ObjectId(),
                            },
                            data: item,
                            meta: {
                                skipHook: true,
                                cascadeContext: ctx.meta.cascadeContext,
                            },
                            session: ctx.session,
                            upsert: true,
                        });
                        ctx.meta.cascadeContext.rollbacks.push(() => {
                            data[key] = value;
                            if (id && oldValue) {
                                return refRepository.model.updateOne({ _id: id }, oldValue);
                            }
                            else {
                                return refRepository.model.deleteOne({ _id: doc._id });
                            }
                        });
                        arr[index] = doc._id;
                    }
                    data[key] = arr;
                }
                else {
                    if (mongoose_1.isValidObjectId(value))
                        continue;
                    const id = value._id || value.id;
                    let oldValue;
                    if (id) {
                        oldValue = yield refRepository.model.findOne({ _id: id });
                    }
                    const doc = yield refRepository.updateOne({
                        query: { _id: id || new mongodb_1.ObjectId() },
                        data: value,
                        meta: {
                            skipHook: true,
                            cascadeContext: ctx.meta.cascadeContext,
                        },
                        session: ctx.session,
                        upsert: true,
                    });
                    ctx.meta.cascadeContext.rollbacks.push(() => {
                        data[key] = value;
                        if (id && oldValue) {
                            return refRepository.model.updateOne({ _id: id }, oldValue);
                        }
                        else {
                            return refRepository.model.deleteOne({ _id: doc._id });
                        }
                    });
                    data[key] = doc._id;
                }
            }
        });
    }
    update(ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const isExcecRollback = !((_a = ctx.meta) === null || _a === void 0 ? void 0 : _a.cascadeContext);
            if (!ctx.meta.cascadeContext) {
                ctx.meta.cascadeContext = {
                    rollbacked: false,
                    rollbacks: [],
                };
            }
            try {
                yield this.cascadeUpdate(ctx);
                return this.model
                    .updateMany(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
                    .then(() => this.find(Object.assign(Object.assign({}, ctx), { meta: Object.assign(Object.assign({}, ctx.meta), { skipHook: true }) })));
            }
            catch (error) {
                if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
                    yield Promise.all(ctx.meta.cascadeContext.rollbacks.map((e) => e()));
                    ctx.meta.cascadeContext.rollbacked = true;
                }
                throw error;
            }
        });
    }
    updateOne(ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const isExcecRollback = !((_a = ctx.meta) === null || _a === void 0 ? void 0 : _a.cascadeContext);
            if (!ctx.meta.cascadeContext) {
                ctx.meta.cascadeContext = {
                    rollbacked: false,
                    rollbacks: [],
                };
            }
            try {
                yield this.cascadeUpdate(ctx);
                return this.model
                    .updateOne(ctx.query, ctx.data, this.getBaseOptionFromContext(ctx))
                    .then(() => this.findOne(Object.assign(Object.assign({}, ctx), { meta: Object.assign(Object.assign({}, ctx.meta), { skipHook: true }) })));
            }
            catch (error) {
                if (isExcecRollback && !ctx.meta.cascadeContext.rollbacked) {
                    yield Promise.all(ctx.meta.cascadeContext.rollbacks.map((e) => e()));
                    ctx.meta.cascadeContext.rollbacked = true;
                }
                throw error;
            }
        });
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
    getBaseOptionFromContext(ctx) {
        const { fields, limit, skip, sort, populates, project, session, safe, upsert, } = ctx;
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
        };
        const value = utils_1.omitBy(options, [undefined, null]);
        if (!Object.keys(value).length) {
            return undefined;
        }
        return value;
    }
}
Reposiory.global = {
    before: {},
    after: {},
};
Reposiory.events = new events_1.default();
Reposiory.repositories = new Map();
__decorate([
    Before(/.*/),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Reposiory.prototype, "baseBeforeAll", null);
__decorate([
    After('delete', 'deleteOne'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "baseAfterDelete", null);
__decorate([
    Before('list', 'find', 'findOne', 'delete', 'deleteOne', 'update', 'updateOne'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Reposiory.prototype, "beforeBaseAction", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Reposiory.prototype, "findOne", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Reposiory.prototype, "find", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "list", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "create", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "createMany", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "update", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "updateOne", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "delete", null);
__decorate([
    Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Reposiory.prototype, "deleteOne", null);
exports.Reposiory = Reposiory;
