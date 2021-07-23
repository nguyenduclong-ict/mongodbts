import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'
import { isValidObjectId } from 'mongoose'

export function IsObjectId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isObjectId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {
        message: `${propertyName} must be valid ObjectId`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            isValidObjectId(value) ||
            (typeof value === 'object' && isValidObjectId(value?.id)) ||
            (typeof value === 'object' && isValidObjectId(value?._id))
          )
        },
      },
    })
  }
}

export function IsRequired(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'ssRequired',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {
        message: `${propertyName} is required`,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          return !!value
        },
      },
    })
  }
}
