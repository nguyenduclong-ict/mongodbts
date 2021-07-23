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
                result[k] = parent[k];
        });
    }
    const data = Reflect.getOwnMetadata(key, target);
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
        const parent = getHooks(constants_1.KEYS.SCHEMA_CASCADE, proto);
        Object.assign(result, parent);
    }
    const data = Reflect.getOwnMetadata(constants_1.KEYS.SCHEMA_CASCADE, target);
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
    if (typeof value === 'string')
        return value;
    if (typeof value === 'object') {
        if (value.constructor.name === 'ObjectID')
            return value.toHexString();
        return value._id || value.id;
    }
};
exports.toMongoId = toMongoId;
const idIsEqual = (val1, val2) => exports.toMongoId(val1) === exports.toMongoId(val2);
exports.idIsEqual = idIsEqual;
