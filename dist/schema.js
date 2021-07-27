"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchema = exports.Cascade = exports.Index = exports.Field = exports.Entity = void 0;
const class_validator_1 = require("class-validator");
const lodash_1 = require("lodash");
const mongoose_1 = require("mongoose");
const constants_1 = require("./constants");
const validate_1 = require("./validate");
// <==== decorators
function Entity(options = {}) {
    return function (constructor) {
        options = Object.assign({ id: true, versionKey: false }, options);
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_OPTIONS, options, constructor);
    };
}
exports.Entity = Entity;
const getType = (type) => {
    return (type === null || type === void 0 ? void 0 : type.schemaName) || (type === null || type === void 0 ? void 0 : type.name);
};
const addValidate = (item, taget, propertyKey) => {
    var _a;
    const isMakeValidate = (obj) => {
        return (!Object.prototype.hasOwnProperty.call(obj, 'addValidate') ||
            obj.addValidate === true);
    };
    if (!isMakeValidate(Array.isArray(item) ? item[0] : item))
        return;
    const each = Array.isArray(item) || ((_a = item.type) === null || _a === void 0 ? void 0 : _a.name) === 'Array';
    const isRequired = each ? !!item[0].required : !!item.required;
    const type = each
        ? getType(item[0].type) || getType(item[0])
        : getType(item.type) || getType(item);
    const result = [];
    // console.log('=>>>', propertyKey, { isRequired, type })
    if (!isRequired)
        result.push(class_validator_1.IsOptional({ each }));
    else {
        result.push(validate_1.IsRequired({ each }));
    }
    switch (type) {
        case 'String':
            if (each)
                result.push(class_validator_1.IsArray());
            if (item.minlength >= 0)
                result.push(class_validator_1.MinLength(item.minlength));
            else if (item.maxlength >= 0)
                result.push(class_validator_1.MaxLength(item.maxlength));
            else if (item.length >= 0)
                result.push(class_validator_1.Length(item.length));
            else
                result.push(class_validator_1.IsString());
            if (item.enum)
                result.push(class_validator_1.IsIn(item.enum));
            break;
        case 'Number':
            if (each)
                result.push(class_validator_1.IsArray());
            if (item.min >= 0)
                result.push(class_validator_1.Min(item.max, { each }));
            else if (item.max >= 0)
                result.push(class_validator_1.Max(item.max, { each }));
            else
                result.push(class_validator_1.IsString());
            if (item.enum)
                result.push(class_validator_1.IsIn(item.enum, { each }));
            break;
        case 'Boolean':
            if (each)
                result.push(class_validator_1.IsArray());
            result.push(class_validator_1.IsBoolean({ each }));
            break;
        case 'ObjectId':
            result.push(validate_1.IsObjectId({ each }));
            break;
    }
    result.forEach((func) => func(taget, propertyKey));
};
const getBaseDefine = (define) => {
    if (Array.isArray(define)) {
        for (let index = 0; index < define.length; index++) {
            const item = define[index];
            define[index] = getBaseDefine(item);
        }
        return define;
    }
    else {
        lodash_1.unset(define, 'addValidate');
        return define;
    }
};
function Field(field) {
    if ([String, Boolean, Number].includes(field)) {
        field = {
            type: field,
        };
    }
    return function (target, propertyKey) {
        const fieldDefine = getBaseDefine(field);
        addValidate(fieldDefine, target, propertyKey);
        const definition = Reflect.getOwnMetadata(constants_1.KEYS.SCHEMA_DEFINITION, target.constructor) || {};
        definition[propertyKey] = getBaseDefine(fieldDefine);
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_DEFINITION, definition, target.constructor);
        // add raw defind for get object description of entity
        const raw = Reflect.getOwnMetadata(constants_1.KEYS.SCHEMA_RAW, target.constructor) || {};
        raw[propertyKey] = Object.assign(Object.assign({}, (Array.isArray(fieldDefine) ? fieldDefine[0] : fieldDefine)), { isArray: Array.isArray(fieldDefine) || getType(fieldDefine.type) === 'Array', type: Array.isArray(fieldDefine)
                ? getType(fieldDefine[0].type) || getType(fieldDefine[0])
                : getType(fieldDefine.type) || getType(fieldDefine) });
        Reflect.defineMetadata(constants_1.KEYS.SCHEMA_RAW, raw, target.constructor);
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
function Cascade(options = {
    create: true,
    update: true,
    delete: false,
    onDelete: 'none',
}) {
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
    const rawDefinition = Reflect.getMetadata(constants_1.KEYS.SCHEMA_RAW, EC) || {};
    if (options.timestamps) {
        if (!rawDefinition.createdAt) {
            rawDefinition.createdAt = {
                type: Date,
                auto: true,
            };
        }
        if (!rawDefinition.updatedAt) {
            rawDefinition.updatedAt = {
                type: Date,
                auto: true,
            };
        }
    }
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
