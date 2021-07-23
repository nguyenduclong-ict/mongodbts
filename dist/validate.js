"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsRequired = exports.IsObjectId = void 0;
const class_validator_1 = require("class-validator");
const mongoose_1 = require("mongoose");
function IsObjectId(validationOptions) {
    return function (object, propertyName) {
        class_validator_1.registerDecorator({
            name: 'isObjectId',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [],
            options: Object.assign({ message: `${propertyName} must be valid ObjectId` }, validationOptions),
            validator: {
                validate(value, args) {
                    return (mongoose_1.isValidObjectId(value) ||
                        (typeof value === 'object' && mongoose_1.isValidObjectId(value === null || value === void 0 ? void 0 : value.id)) ||
                        (typeof value === 'object' && mongoose_1.isValidObjectId(value === null || value === void 0 ? void 0 : value._id)));
                },
            },
        });
    };
}
exports.IsObjectId = IsObjectId;
function IsRequired(validationOptions) {
    return function (object, propertyName) {
        class_validator_1.registerDecorator({
            name: 'ssRequired',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [],
            options: {
                message: `${propertyName} is required`,
            },
            validator: {
                validate(value, args) {
                    return !!value;
                },
            },
        });
    };
}
exports.IsRequired = IsRequired;
