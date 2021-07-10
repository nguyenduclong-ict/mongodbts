import { Schema, SchemaDefinition, SchemaOptions } from 'mongoose';
import 'reflect-metadata';
export declare function Entity(options?: SchemaOptions): (constructor: any) => void;
export declare function Field(fieldDefinition: SchemaDefinition[''] | {
    type: any;
}): (target: any, propertyKey: string) => void;
export declare function Index<E = any>(fields: {
    [K in keyof E]: 0 | 1;
}, options?: any): (constructor: any) => void;
export interface CascadeOptions {
    create?: boolean;
    update?: boolean;
    delete?: boolean;
    /**
     * 'none' when reference delete no action
     * 'null' when reference delete set field to null
     * 'cascade' when reference delete => remove this document
     */
    onDelete?: 'none' | 'null' | 'cascade';
}
export declare function Cascade(options?: CascadeOptions): (target: any, propertyKey: string) => void;
export declare function createSchema<E = any>(EC: any): Schema<E>;
export interface Timestamp {
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}
export interface Entity {
    readonly id?: any;
    readonly _id?: any;
}
