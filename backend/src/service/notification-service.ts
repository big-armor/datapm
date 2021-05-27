import AwaitLock from "await-lock";

let timeout: NodeJS.Timeout | null;
let continueRunning = false;
let isRunningValue = false;
let stateLock = new AwaitLock();

export function startNotificationService() {
    continueRunning = true;
    nextIteration();
}

async function isRunning() {}

export async function stopNotificationService() {
    continueRunning = false;
    if (timeout) clearTimeout(timeout);

    await stateLock.acquireAsync();
    stateLock.release();
}

async function nextIteration() {
    if (!continueRunning) {
        return;
    }

    timeout = setTimeout(async () => {
        await stateLock.acquireAsync();

        try {
            isRunningValue = true;
            await sendNotifications();
        } finally {
            isRunningValue = false;
            stateLock.release();
            nextIteration();
        }
    }, 5 * 1000);
}

async function sendNotifications() {
    console.log("Sending notifications");
    await new Promise((resolve) => {
        setTimeout(resolve, 15000);
    });
    console.log("Finished sending notifications");
}
