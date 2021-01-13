import { Connection, EntityManager, EntityRepository } from "typeorm";
import { ActivityLog } from "../entity/ActivityLog";
import { ActivityLogChangeType, ActivityLogEventType } from "../entity/ActivityLogEventType";

export interface ActivityLogTemp {
    userId: number;
    eventType: ActivityLogEventType;
    changeType?: ActivityLogChangeType;
    targetPackageId?: number;
    targetPackageVersionId?: number;
    targetCatalogId?: number;
    targetCollectionId?: number;
    propertiesEdited?: string[];
}

/** Creates a new ActivityLog entry in the database, and logs it */
export async function createActivityLog(connection: EntityManager | Connection, activityLogTemp: ActivityLogTemp) {
    const activityLog = new ActivityLog();
    activityLog.userId = activityLogTemp.userId;
    activityLog.eventType = activityLogTemp.eventType;
    activityLog.changeType = activityLogTemp.changeType;
    activityLog.targetPackageId = activityLogTemp.targetPackageId;
    activityLog.targetPackageVersionId = activityLogTemp.targetPackageVersionId;
    activityLog.targetCatalogId = activityLogTemp.targetCatalogId;
    activityLog.targetCollectionId = activityLogTemp.targetCollectionId;
    activityLog.propertiesEdited = activityLogTemp.propertiesEdited;

    await connection.getCustomRepository(ActivityLogRepository).create(activityLog);
}
@EntityRepository(ActivityLog)
export class ActivityLogRepository {
    constructor(private manager: EntityManager) {}

    async create(activityLog: ActivityLog): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const entity = transaction.create(ActivityLog, activityLog);
            if (
                activityLog.eventType !== ActivityLogEventType.PACKAGE_DELETED &&
                activityLog.eventType !== ActivityLogEventType.VERSION_DELETED &&
                activityLog.eventType !== ActivityLogEventType.COLLECTION_DELETED &&
                activityLog.eventType !== ActivityLogEventType.CATALOG_DELETED &&
                activityLog.eventType !== ActivityLogEventType.USER_DELETED
            ) {
                await transaction.save(entity);
            }

            console.log(JSON.stringify(entity));
        });
    }
}
