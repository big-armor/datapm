/* eslint-disable no-extend-native */
/** Run each call back in serial */
export async function asyncForEach<T>(
    array: Array<T>,
    callback: (object: T, index: number, array: Array<T>) => Promise<void>
): Promise<void> {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

/** Run all callbacks in parallel */
export async function parallelAsyncForEach<T>(
    array: Array<T>,
    callback: (object: T, index: number, array: Array<T>) => Promise<void>
): Promise<void[]> {
    const promises: Promise<void>[] = [];
    for (let index = 0; index < array.length; index++) {
        promises.push(callback(array[index], index, array));
    }

    return Promise.all(promises);
}

declare global {
    interface Array<T> {
        asyncFilter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: unknown): Promise<T[]>;
        asyncForEach(callback: (object: T, index: number, array: Array<T>) => Promise<void>): Promise<void>;
        parallelAsyncForEach<T>(
            array: Array<T>,
            callback: (object: T, index: number, array: Array<T>) => Promise<void>
        ): void;

        asyncFlatMap<O>(asyncFn: (t: T) => Promise<O[]>): Promise<O[]>;
        asyncMap<O>(asyncFn: (t: T) => Promise<O>): Promise<O[]>;
    }
}

Array.prototype.asyncForEach = async function <T>(
    callback: (object: T, index: number, array: Array<T>) => Promise<void>
): Promise<void> {
    return asyncForEach(this, callback);
};
Array.prototype.parallelAsyncForEach = parallelAsyncForEach;

Array.prototype.asyncFilter = async function <T>(
    predicate: (value: T, index: number, array: T[]) => unknown
): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const array = this;
    const booleans = await Promise.all(array.map(predicate));
    return array.filter((_x, i) => booleans[i]);
};

Array.prototype.asyncMap = async function <T, O>(asyncFn: (t: T) => Promise<O>): Promise<O[]> {
    return asyncMap(this, asyncFn);
};

Array.prototype.asyncFlatMap = async function <T, O>(asyncFn: (t: T) => Promise<O[]>): Promise<O[]> {
    return asyncFlatMap(this, asyncFn);
};

async function asyncFlatMap<T, O>(arr: T[], asyncFn: (t: T) => Promise<O[]>): Promise<O[]> {
    return Promise.all(flatten(await asyncMap(arr, asyncFn)));
}

function flatten<T>(arr: T[][]): T[] {
    return ([] as T[]).concat(...arr);
}

export function asyncMap<T, O>(arr: T[], asyncFn: (t: T) => Promise<O>): Promise<O[]> {
    return Promise.all(arr.map(asyncFn));
}
