export class TimeoutPromise<T> extends Promise<T> {
    constructor(
        timeout: number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void
    ) {
        // We need to support being called with no milliseconds
        // value, because the various Promise methods (`then` and
        // such) correctly call the subclass constructor when
        // building the new promises they return.
        const haveTimeout = typeof timeout === "number";
        const init = haveTimeout ? callback : timeout;
        super((resolve, reject) => {
            if (haveTimeout) {
                const timer = setTimeout(() => {
                    reject(new Error(`Promise timed out after ${timeout}ms`));
                }, timeout);
                init(
                    (value: T | PromiseLike<T>) => {
                        clearTimeout(timer);
                        resolve(value);
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (error: any) => {
                        clearTimeout(timer);
                        reject(error);
                    }
                );
            } else {
                init(resolve, reject);
            }
        });
    }

    // Pick your own name of course. (You could even override `resolve` itself
    // if you liked; just be sure to do the same arguments detection we do
    // above in the constructor, since you need to support the standard use of
    // `resolve`.)
    static resolveWithTimeout<T>(timeout: number, x: Promise<T>): Promise<T> {
        if (!x || typeof x.then !== "function") {
            // `x` isn't a thenable, no need for the timeout,
            // fulfill immediately
            return this.resolve(x);
        }
        return new this(timeout, x.then.bind(x));
    }
}
