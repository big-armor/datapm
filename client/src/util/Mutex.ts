export class Mutex<T> {
    private mutex = Promise.resolve();

    lock(): PromiseLike<() => void> {
        let begin: (unlock: () => void) => void;

        this.mutex = this.mutex.then(() => {
            return new Promise(begin);
        });

        return new Promise((resolve) => {
            begin = resolve;
        });
    }

    async dispatch(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
        const unlock = await this.lock();
        try {
            return await Promise.resolve(fn());
        } finally {
            unlock();
        }
    }
}
