/// <reference types="node" />
import { Connection, FilterQuery, Model, PopulateOptions, Schema, UpdateQuery } from 'mongoose';
import { CascadeOptions } from './schema';
import EventEmmit from 'events';
declare type Constructor<T = {}> = new (...args: any[]) => T;
export declare function repository(EntityClass: any, connection?: Connection): <T extends Constructor<Reposiory<any>>>(constructor: T) => {
    new (...args: any[]): {
        baseOnInited(): void;
        name: string;
        model: Model<any, {}, {}>;
        schema: Schema<any, Model<any, any, any>, undefined, any>;
        connection: Connection;
        readonly $events: EventEmmit;
        onInited(): void;
        baseBeforeAll(ctx: Context<{}>): void;
        baseAfterDelete(ctx: ContextDelete<any, {}>, rs: any): Promise<any>;
        beforeBaseAction(ctx: Context<{}> & {
            query: any;
        }): void;
        onCreateSchema(schema: Schema<any, Model<any, any, any>, undefined, any>): Schema<any, Model<any, any, any>, undefined, any>;
        $before: {
            [x: string]: string[];
        };
        $after: {
            [x: string]: string[];
        };
        $cascade: {
            [x: string]: CascadeOptions;
        };
        findOne(ctx?: FindOneContext<any, {}>): Promise<any>;
        find(ctx?: FindContext<any, {}>): Promise<any[]>;
        list(ctx?: ListContext<any, {}>): Promise<{
            data: any[];
            pageSize: number;
            page: number;
            totalPages: number;
            total: number;
        }>;
        cascadeCreate(ctx: ContextCreate<any, {
            cascadeContext?: CascadeContext;
        }>): Promise<void>;
        create(ctx: ContextCreate<any, {
            cascadeContext?: CascadeContext;
        }>): Promise<any>;
        createMany(ctx: ContextCreateMany<any, {
            cascadeContext?: CascadeContext;
        }>): Promise<any[]>;
        cascadeUpdate(ctx: ContextUpdate<any, {
            cascadeContext?: CascadeContext;
        }>): Promise<void>;
        update(ctx: ContextUpdate<any, {
            cascadeContext?: CascadeContext;
        }>): Promise<any[]>;
        updateOne(ctx: ContextUpdate<any, {
            cascadeContext?: CascadeContext;
        }>): Promise<any>;
        delete(ctx: ContextDelete<any, {}>): Promise<number>;
        deleteOne(ctx: ContextDelete<any, {}>): Promise<number>;
        getBaseOptionFromContext<T_1 extends object>(ctx: T_1): Partial<T_1>;
    };
} & T;
export declare function Before(...actions: any[]): (target: Reposiory, propertyKey: string) => void;
export declare function After(...actions: any[]): (target: Reposiory, propertyKey: string) => void;
export declare function Action(): (target: Reposiory, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => void;
/** Context */
export interface Context<M = {}> {
    meta?: M & {
        skipHook?: boolean;
        [x: string]: any;
    };
}
/** FindOne Context */
export interface ContextOptions<E> {
    project?: {
        [K in keyof E]: 0 | 1;
    } & {
        [x: string]: 0 | 1;
    };
    fields?: (keyof E)[];
    sort?: {
        [K in keyof E]: 0 | 1;
    } & {
        [x: string]: 0 | 1;
    };
    populates?: (keyof E)[] | Array<PopulateOptions>;
    limit?: number;
    skip?: number;
    session?: any;
}
export interface FindOneContext<E = any, M = {}> extends Context<M>, ContextOptions<E> {
    query?: FilterQuery<E>;
}
/** FindOne Context */
export interface FindContext<E = any, M = {}> extends FindOneContext<E, M> {
}
/** List Context */
export interface ListContext<E = any, M = {}> extends FindContext<E, M> {
    page?: number;
    pageSize?: number;
}
/** Create Context */
interface ContextCreate<E = any, M = {
    cascadeContext?: CascadeContext;
}> extends Context<M> {
    data: E;
    session?: any;
    safe?: boolean;
    populates?: (keyof E)[] | Array<PopulateOptions>;
}
/** CreateMany Context */
interface ContextCreateMany<E = any, M = {
    cascadeContext?: CascadeContext;
}> extends Context<M>, ContextOptions<E> {
    data: E[];
    safe?: boolean;
    session?: any;
    populates?: (keyof E)[] | Array<PopulateOptions>;
}
/** Update Context */
interface ContextUpdate<E = any, M = {
    cascadeContext?: CascadeContext;
}> extends Context<M>, ContextOptions<E> {
    query: FilterQuery<E>;
    data: UpdateQuery<E>;
    upsert?: boolean;
    populates?: (keyof E)[] | Array<PopulateOptions>;
}
/** Delete Context */
interface ContextDelete<E = any, M = {}> extends Context<M>, ContextOptions<E> {
    query: FilterQuery<E>;
}
export interface CascadeContext {
    rollbacked: boolean;
    rollbacks: any[];
}
/**
 * Repository
 */
export declare class Reposiory<E = any> {
    name: string;
    model: Model<E>;
    schema: Schema<E>;
    connection: Connection;
    static global: {
        before: any;
        after: any;
    };
    static addBefore(actions: any, handler: any): void;
    static addAfter(actions: any, handler: any): void;
    static events: EventEmmit;
    static repositories: Map<Connection, {
        [x: string]: Reposiory;
    }>;
    static getRepository(connection: Connection, name: string): Reposiory<any>;
    static registerRepository(connection: Connection, repository: Reposiory): boolean;
    get $events(): EventEmmit;
    constructor(connection?: Connection);
    onInited(): void;
    baseBeforeAll(ctx: Context): void;
    baseAfterDelete(ctx: ContextDelete<E>, rs: any): Promise<any>;
    beforeBaseAction(ctx: Context & {
        query: any;
    }): void;
    onCreateSchema(schema: Schema<E>): Schema<E>;
    $before: {
        [x: string]: string[];
    };
    $after: {
        [x: string]: string[];
    };
    $cascade: {
        [x: string]: CascadeOptions;
    };
    findOne(ctx?: FindOneContext<E>): Promise<import("mongoose").EnforceDocument<E, {}>>;
    find(ctx?: FindContext<E>): Promise<import("mongoose").EnforceDocument<E, {}>[]>;
    list(ctx?: ListContext<E>): Promise<{
        data: import("mongoose").EnforceDocument<E, {}>[];
        pageSize: number;
        page: number;
        totalPages: number;
        total: number;
    }>;
    cascadeCreate(ctx: ContextCreate<E>): Promise<void>;
    create(ctx: ContextCreate<E>): Promise<import("mongoose").EnforceDocument<E, {}>>;
    createMany(ctx: ContextCreateMany<E>): Promise<import("mongoose").EnforceDocument<E, {}>[]>;
    cascadeUpdate(ctx: ContextUpdate<E>): Promise<void>;
    update(ctx: ContextUpdate<E>): Promise<import("mongoose").EnforceDocument<E, {}>[]>;
    updateOne(ctx: ContextUpdate<E>): Promise<import("mongoose").EnforceDocument<E, {}>>;
    delete(ctx: ContextDelete<E, {}>): Promise<number>;
    deleteOne(ctx: ContextDelete<E>): Promise<number>;
    getBaseOptionFromContext<T extends object>(ctx: T): Partial<T>;
}
export {};
