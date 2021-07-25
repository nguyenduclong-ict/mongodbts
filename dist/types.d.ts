export declare type LiteralUnion<T extends U, U = string | symbol | number> = T | (U & {});
declare global {
    namespace Mongodbts {
        interface BaseMeta {
            skipHook?: boolean;
            [x: string]: any;
        }
        interface BaseOptions {
            [x: string]: any;
        }
    }
}
export {};
