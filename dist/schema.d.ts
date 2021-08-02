import { Schema, SchemaDefinitionProperty, SchemaOptions } from 'mongoose';
export interface MongoSchemaOptions extends SchemaOptions {
    name?: string;
    description?: string;
}
export declare function Entity(options?: MongoSchemaOptions): (constructor: any) => void;
export declare type FieldType = SchemaDefinitionProperty<any> & {
    type?: any;
    default?: any;
    addValidate?: boolean;
};
export declare function Field(field: FieldType): PropertyDecorator;
export declare function Index<E = any>(fields: {
    [K in keyof E]?: 0 | 1 | 'text';
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
export declare type Entity<E> = E & {
    readonly id?: any;
    readonly _id?: any;
};
