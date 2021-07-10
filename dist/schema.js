"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchema = exports.Cascade = exports.Index = exports.Field = exports.Entity = void 0;
const mongoose_1 = require("mongoose");
require("reflect-metadata");
const constants_1 = require("./constants");
// <==== decorators
function Entity(options = {}) {
    return function (constructor) {
        options = Object.assign({ id: true, versionKey: false }, options);
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_OPTIONS, options, constructor);
    };
}
exports.Entity = Entity;
function Field(fieldDefinition) {
    return function (target, propertyKey) {
        const definition = Reflect.getOwnMetadata(constants_1.KEYS.SCHEMA_DEFINITION, target.constructor) || {};
        definition[propertyKey] = fieldDefinition;
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_DEFINITION, definition, target.constructor);
    };
}
exports.Field = Field;
function Index(fields, options) {
    return function (constructor) {
        const value = Reflect.getOwnMetadata(constants_1.KEYS.SCHEMA_INDEXES, constructor) || [];
        value.push({ fields, options });
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_INDEXES, value, constructor);
    };
}
exports.Index = Index;
function Cascade(options = { create: true, update: true, onDelete: 'none' }) {
    return function (target, propertyKey) {
        const value = Reflect.getOwnMetadata(constants_1.KEYS.SCHEMA_CASCADE, target.constructor) || {};
        value[propertyKey] = options;
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_CASCADE, value, target.constructor);
    };
}
exports.Cascade = Cascade;
// decorators ====>
// <==== funtioncs
function createSchema(EC) {
    const options = Reflect.getMetadata(constants_1.KEYS.SCHEMA_OPTIONS, EC) || {};
    const definition = Reflect.getMetadata(constants_1.KEYS.SCHEMA_DEFINITION, EC) || {};
    const indexes = Reflect.getMetadata(constants_1.KEYS.SCHEMA_INDEXES, EC) || [];
    const schema = new mongoose_1.Schema(definition, options);
    indexes.forEach(({ fields, options: opts }) => {
        schema.index(fields, opts);
    });
    if (options.id) {
        schema.set('toJSON', {
            virtuals: true,
            versionKey: false,
            transform: (doc, ret) => {
                delete ret._id;
                ret.id = doc._id;
            },
        });
        schema.set('toObject', {
            virtuals: true,
            versionKey: false,
            transform: (doc, ret) => {
                delete ret._id;
                ret.id = doc._id;
            },
        });
    }
    return schema;
}
exports.createSchema = createSchema;
