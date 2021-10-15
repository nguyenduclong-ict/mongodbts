import 'reflect-metadata';
import { ConnectOptions } from 'mongoose';
import { CascadeOptions } from './schema';
import get from 'lodash/get';
import set from 'lodash/set';
import pick from 'lodash/pick';
import { ObjectId } from 'mongodb';
export { get, set, pick };
export declare function createMongoConnection(uri: string, options?: ConnectOptions): {
    connection: import("mongoose").Connection & Promise<import("mongoose").Connection>;
    ready: Promise<unknown>;
};
export declare function omitBy<T extends object>(value: T, omitCheck: ((k: string, v: any) => boolean) | any[] | number | string | object): Partial<T>;
export declare function getHooks(key: 'before' | 'after', target: any): {
    [x: string]: any[];
};
export declare function getActions(target: any): string[];
export declare function getCascades(target: any): {
    [x: string]: CascadeOptions;
};
export declare const toMongoId: (value: any) => ObjectId;
export declare const idIsEqual: (val1: any, val2: any) => boolean;
