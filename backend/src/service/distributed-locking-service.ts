import PGMutexLock from "pg-mutex-lock";

export class DistributedLockingService {
    mutex: PGMutexLock;

    constructor() {
        this.mutex = new PGMutexLock({
            database: {
                host: process.env.TYPEORM_HOST || "localhost",
                port: Number.parseInt(process.env.TYPEORM_PORT as string),
                database: process.env.TYPEORM_DATABASE,
                password: process.env.TYPEORM_PASSWORD,
                user: process.env.TYPEORM_USERNAME
            },
            retryCount: 1,
            timeout: 1000
        });
    }

    /**
     *
     * @param key The key to lock
     * @param attemptCount The number of 1 second attempts to acquire the lock
     * @param callback function to call when the lock is acquired
     * @returns
     */
    async lock(key: string, attemptCount = 1): Promise<boolean> {
        let attempts = 0;

        while (attempts < attemptCount) {
            let lockAquired = false;
            try {
                lockAquired = await this.mutex.acquireLock(key);
            } catch (error) {}
            attempts += 1;

            if (lockAquired) {
                return true;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return false;
    }

    async unlock(key: string): Promise<void> {
        await this.mutex.releaseLock(key);
    }

    async stop(): Promise<void> {
        await this.mutex.end();
    }
}
