import PGMutexLock from "pg-mutex-lock";
import { Connection } from "typeorm";
import { DistributedLockingService } from "./distributed-locking-service";
import { startNotificationService, stopNotificationService } from "./notification-service";
import { startPackageUpdateService, stopPackageUpdateService } from "./package-update-service";

const LEADER_KEY = "datapm-leader";



export class LeaderElectionService {

    leader = false;

    continueAttempting = true;

    constructor(private distributedLockingService: DistributedLockingService, private connection: Connection) {}

    async start() {
        if (process.env["LEADER_ELECTION_DISABLED"] === "true") {
            console.log(
                "LEADER_ELECTION_DISABLED is true. Not starting leader election, no background services will run on this instance."
            );
            return;
        }

        while (this.continueAttempting) {
            try {
                this.leader = await this.distributedLockingService.lock(LEADER_KEY);
                if (this.leader) {
                    console.log("I am the leader");
                    this.startLeaderServices();
                    this.continueAttempting = false;
                }
            } catch (error) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                });
            }
        }

    }

    async stop() {

        this.continueAttempting = false;

        if (this.leader) {
            await this.stopLeaderServices();
            await this.distributedLockingService.unlock(LEADER_KEY);
        }
    }

    startLeaderServices():void {
        startNotificationService(this.connection);
        startPackageUpdateService(this.connection);
    }

    async stopLeaderServices() {
        return Promise.all([stopNotificationService(), stopPackageUpdateService()]);
    }
}