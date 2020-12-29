import { EntityManager, EntityRepository } from "typeorm";
import { ActivityLog } from "../entity/ActivityLog";
import { ActivityLogEventType } from "../entity/ActivityLogEventType";

@EntityRepository(ActivityLog)
export class ActivityLogRepository {
    constructor(private manager: EntityManager) {}

    async create(activityLog: ActivityLog): Promise<void> {
        let log: ActivityLog;
        return this.manager.nestedTransaction(async (transaction) => {
            if (activityLog.eventType !== ActivityLogEventType.PackageDeleted) {
                log = await transaction.create(ActivityLog, activityLog);
            } else {
                console.log(JSON.stringify(log));
            }

            Promise.resolve();
        });
    }
}
