import { EntityManager, EntityRepository } from "typeorm";
import { ActivityLog } from "../entity/ActivityLog";
import { ActivityLogEventType } from "../entity/ActivityLogEventType";

@EntityRepository(ActivityLog)
export class ActivityLogRepository {
    constructor(private manager: EntityManager) {}

    async create(activityLog: ActivityLog): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const entity = transaction.create(ActivityLog, activityLog);
            if (activityLog.eventType !== ActivityLogEventType.PACKAGE_DELETED) {
                await transaction.save(entity);
            }

            console.log(JSON.stringify(entity));
        });
    }
}
