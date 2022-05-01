"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idIsEqual = exports.toMongoId = exports.getCascades = exports.getActions = exports.getHooks = exports.omitBy = exports.createMongoConnection = exports.pick = exports.set = exports.get = void 0;
require("reflect-metadata");
const mongoose_1 = require("mongoose");
const constants_1 = require("./constants");
const get_1 = __importDefault(require("lodash/get"));
exports.get = get_1.default;
const set_1 = __importDefault(require("lodash/set"));
exports.set = set_1.default;
const pick_1 = __importDefault(require("lodash/pick"));
exports.pick = pick_1.default;
const meta_1 = require("./meta");
const mongodb_1 = require("mongodb");
function createMongoConnection(uri, options) {
    const connection = mongoose_1.createConnection(uri || 'mongodb://localhost:27017', Object.assign({ useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false, autoIndex: true }, options));
    const ready = new Promise((resolve) => {
        connection.on('connected', () => {
            console.log('connected database', connection.db.databaseName);
            resolve(connection);
        });
    });
    return { connection, ready };
}
exports.createMongoConnection = createMongoConnection;
function omitBy(value, omitCheck) {
    const result = {};
    Object.keys(value).forEach((key) => {
        if (typeof omitCheck === 'function' &&
            omitCheck(key, value[key])) {
            return;
        }
        if (Array.isArray(omitCheck) && omitCheck.includes(value[key])) {
            return;
        }
        if (omitCheck === value[key])
            return;
        result[key] = value[key];
    });
    return result;
}
exports.omitBy = omitBy;
function getHooks(key, target) {
    const result = {};
    const proto = Object.getPrototypeOf(target);
    if (proto && proto !== Object.getPrototypeOf(Function)) {
        const parent = getHooks(key, proto);
        Object.keys(parent).forEach((k) => {
            if (result[k])
                result[k].push(...parent[k]);
            else
                result[k] = [...parent[k]];
        });
    }
    const data = meta_1.hooks[key].get(target);
    if (data) {
        Object.keys(data).forEach((k) => {
            if (result[k])
                result[k].push(...data[k]);
            else
                result[k] = data[k];
        });
    }
    return result;
}
exports.getHooks = getHooks;
function getActions(target) {
    const key = constants_1.KEYS.REPOSITORY_ACTIONS;
    const result = [];
    const proto = Object.getPrototypeOf(target);
    if (proto && proto !== Object.getPrototypeOf(Function)) {
        result.push(...getActions(proto));
    }
    result.push(...(Reflect.getOwnMetadata(key, target) || []));
    return result;
}
exports.getActions = getActions;
function getCascades(target) {
    const result = {};
    const proto = Object.getPrototypeOf(target);
    if (proto && proto !== Object.getPrototypeOf(Function)) {
        const parent = getCascades(proto);
        Object.assign(result, parent);
    }
    const data = meta_1.hooks.cascade.get(target);
    // const data = Reflect.getOwnMetadata(KEYS.SCHEMA_CASCADE, target)
    if (data) {
        Object.assign(result, data);
    }
    return result;
}
exports.getCascades = getCascades;
// mongoid
// -------
const toMongoId = (value) => {
    if (!value)
        return null;
    let result;
    if (value instanceof mongodb_1.ObjectId)
        return result;
    else if (typeof value === 'string')
        result = value;
    else if (typeof value === 'object')
        result = value._id || value.id || value;
    try {
        return result ? new mongodb_1.ObjectId(result) : null;
    }
    catch (error) {
        return result;
    }
};
exports.toMongoId = toMongoId;
const idIsEqual = (val1, val2) => {
    var _a;
    if ((!val1 && !val2) || (!val1 && val2) || (val1 && !val2))
        return true;
    try {
        return (_a = exports.toMongoId(val1)) === null || _a === void 0 ? void 0 : _a.equals(exports.toMongoId(val2));
    }
    catch (error) {
        return false;
    }
};
exports.idIsEqual = idIsEqual;
