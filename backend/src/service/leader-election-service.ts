import PGMutexLock from "pg-mutex-lock";
import { Connection } from "typeorm";
import { startNotificationService, stopNotificationService } from "./notification-service";

let mutex: PGMutexLock | null;

const LEADER_KEY = "datapm-leader";

let continueAttempting = true;

let leader = false;

export async function startLeaderElection(connection: Connection) {
    if (process.env["LEADER_ELECTION_DISABLED"] === "true") {
        console.log(
            "LEADER_ELECTION_DISABLED is true. Not starting leader election, no background services will run on this instance."
        );
        return;
    }

    mutex = new PGMutexLock({
        database: {
            host: process.env["TYPEORM_HOST"] || "localhost",
            port: Number.parseInt(process.env["TYPEORM_PORT"] as string),
            database: process.env["TYPEORM_DATABASE"],
            password: process.env["TYPEORM_PASSWORD"],
            user: process.env["TYPEORM_USERNAME"]
        },
        retryCount: 1,
        timeout: 2 * 1000
    });

    process.once("SIGINT", () => {
        //  stopLeaderElection();
    });

    while (continueAttempting) {
        try {
            leader = await mutex.acquireLock(LEADER_KEY);
            if (leader) {
                console.log("I am the leader");
                startLeaderServices(connection);
            }
        } catch (error) {
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
        }
    }
}

export async function stopLeaderElection() {
    continueAttempting = false;

    if (leader) {
        await stopLeaderServices();
        await mutex?.releaseLock(LEADER_KEY);
    }
    await mutex?.end();
}

function startLeaderServices(connection: Connection) {
    startNotificationService(connection);
}

async function stopLeaderServices() {
    await stopNotificationService();
}
