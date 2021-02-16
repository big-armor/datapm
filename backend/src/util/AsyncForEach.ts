/** Run each call back in serial */
export async function asyncForEach<T>(
    array: Array<T>,
    callback: (object: T, index: number, array: Array<T>) => Promise<void>
) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

/** Run all callbacks in parallel */
export async function parallelAsyncForEach<T>(
    array: Array<T>,
    callback: (object: T, index: number, array: Array<T>) => Promise<void>
) {
    const promises: Promise<void>[] = [];
    for (let index = 0; index < array.length; index++) {
        promises.push(callback(array[index], index, array));
    }

    return Promise.all(promises);
}
