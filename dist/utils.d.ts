import { ConnectOptions } from 'mongoose';
import 'reflect-metadata';
import { CascadeOptions } from 'schema';
export declare function createMongoConnection(uri: string, options?: ConnectOptions): {
    connection: import("mongoose").Connection & Promise<import("mongoose").Connection>;
    ready: Promise<unknown>;
};
export declare function omitBy<T extends object>(value: T, omitCheck: ((k: string, v: any) => boolean) | any[] | number | string | object): Partial<T>;
export declare function getHooks(key: any, target: any): {
    [x: string]: any[];
};
export declare function getActions(target: any): string[];
export declare function getCascades(target: any): {
    [x: string]: CascadeOptions;
};
