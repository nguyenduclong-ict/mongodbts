import { ValidationOptions } from 'class-validator';
export declare function IsObjectId(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsRequired(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
