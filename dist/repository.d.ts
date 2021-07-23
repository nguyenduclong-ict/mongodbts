/// <reference types="node" />
import EventEmmit from 'events';
import { AnyObject, Connection, FilterQuery, Model, PopulateOptions, Schema, UpdateQuery } from 'mongoose';
import { CascadeOptions } from './schema';
declare type Constructor<T = {}> = new (...args: any[]) => T;
export declare function repository(EntityClass: any, connection?: Connection): <T extends Constructor<Repository<any>>>(constructor: T) => {
    new (...args: any[]): {
        baseOnInited(): void;
        name: string;
        model: Model<any, {}, {}>;
        schema: Schema<any, Model<any, any, any>, undefined, any>;
        connection: Connection;
        entityCls: any;
        readonly $events: EventEmmit;
        getRef(key: string): {
            isArray: boolean;
            ref: any;
        };
        onInited(): void;
        baseBeforeAll(ctx: Context<{}> & CascadeContext): void;
        baseAfterDelete(ctx: ContextDelete<any, {}>, rs: any): Promise<any>;
        beforeBaseAction(ctx: Context<{}> & CascadeContext & {
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
        getQueryProject(fields: object | (string | number | symbol)[]): object | (string | number | symbol)[];
        findOne(ctx?: FindOneContext<any, {}>): Promise<any>;
        find(ctx?: FindContext<any, {}>): Promise<any[]>;
        list(ctx?: ListContext<any, {}>): Promise<{
            data: any[];
            pageSize: number;
            page: number;
            totalPages: number;
            total: number;
        }>;
        cascadeCreate(ctx: ContextCreate<any, AnyObject>): Promise<void>;
        create(ctx: ContextCreate<any, AnyObject>): Promise<any>;
        createMany(ctx: ContextCreateMany<any, AnyObject>): Promise<any[]>;
        cascadeUpdate(ctx: ContextUpdate<any, AnyObject>): Promise<void>;
        update(ctx: ContextUpdate<any, AnyObject>): Promise<any[]>;
        updateOne(ctx: ContextUpdate<any, AnyObject>): Promise<any>;
        getCascadeContext(ctx: Context<CascadeContext> & CascadeContext): {
            cascade: true;
            rollback: Rollback;
            execRollback: boolean;
        };
        delete(ctx: ContextDelete<any, {}>): Promise<number>;
        deleteOne(ctx: ContextDelete<any, {}>): Promise<number>;
        getBaseOptionFromContext<T_1 extends object>(ctx: T_1, excludes?: string[]): Partial<T_1>;
        validate(data: any): Promise<import("class-validator").ValidationError[]>;
    };
} & T;
export declare function Before(...actions: any[]): (target: Repository, propertyKey: string) => void;
export declare function After(...actions: any[]): (target: Repository, propertyKey: string) => void;
export declare function Action(): (target: Repository, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => void;
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
    fields?: (keyof E | (string & {}))[];
    sort?: {
        [K in keyof E]: 0 | 1;
    } & {
        [x: string]: 0 | 1;
    };
    populates?: (keyof E | (string & {}) | PopulateOptions)[];
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
interface CascadeContext {
    rollback?: Rollback;
    execRollback?: boolean;
    cascade?: boolean;
}
/** Create Context */
interface ContextCreate<E = any, M = AnyObject> extends Context<M>, CascadeContext {
    query?: FilterQuery<E>;
    data: E;
    session?: any;
    safe?: boolean;
    populates?: (keyof E)[] | Array<PopulateOptions>;
}
/** CreateMany Context */
interface ContextCreateMany<E = any, M = AnyObject> extends Context<M>, ContextOptions<E>, CascadeContext {
    query?: FilterQuery<E>;
    data: E[];
    safe?: boolean;
    session?: any;
    populates?: (keyof E)[] | Array<PopulateOptions>;
}
/** Update Context */
interface ContextUpdate<E = any, M = AnyObject> extends Context<M>, ContextOptions<E>, CascadeContext {
    query: FilterQuery<E>;
    data: UpdateQuery<E>;
    upsert?: boolean;
    populates?: (keyof E)[] | Array<PopulateOptions>;
}
/** Delete Context */
interface ContextDelete<E = any, M = {}> extends Context<M>, ContextOptions<E>, CascadeContext {
    query: FilterQuery<E>;
}
/**
 * Rollback
 */
export declare class Rollback {
    actions: any[];
    rollbacked: boolean;
    error: any;
    results: any[];
    errorIndex: number;
    constructor(options?: Partial<Rollback>);
    add(action: any): void;
    run(): Promise<boolean>;
}
/**
 * Repository
 */
export declare class Repository<E = any> {
    name: string;
    model: Model<E>;
    schema: Schema<E>;
    connection: Connection;
    entityCls: E;
    static global: {
        before: any;
        after: any;
    };
    static addBefore(actions: any, handler: any): void;
    static addAfter(actions: any, handler: any): void;
    static events: EventEmmit;
    static repositories: Map<Connection, {
        [x: string]: Repository;
    }>;
    static getRepository(connection: Connection, name: string): Repository<any>;
    static registerRepository(connection: Connection, repository: Repository): boolean;
    get $events(): EventEmmit;
    constructor(connection?: Connection);
    getRef(key: string): {
        isArray: boolean;
        ref: any;
    };
    onInited(): void;
    baseBeforeAll(ctx: Context & CascadeContext): void;
    baseAfterDelete(ctx: ContextDelete<E>, rs: any): Promise<any>;
    beforeBaseAction(ctx: Context & CascadeContext & {
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
    getQueryProject(fields: object | (keyof E)[]): object | (keyof E)[];
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
    getCascadeContext(ctx: Context<CascadeContext> & CascadeContext): {
        cascade: true;
        rollback: Rollback;
        execRollback: boolean;
    };
    delete(ctx: ContextDelete<E, {}>): Promise<number>;
    deleteOne(ctx: ContextDelete<E>): Promise<number>;
    getBaseOptionFromContext<T extends object>(ctx: T, excludes?: string[]): Partial<T>;
    validate(data: E | undefined | AnyObject): Promise<import("class-validator").ValidationError[]>;
}
export {};
