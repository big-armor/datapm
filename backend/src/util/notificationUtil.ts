import { ActivityLogEventType } from "../generated/graphql";

export interface Notification {
    userId: number;
    catalogNotifications: CatalogNotification[];
}

export interface CatalogNotification {
    catalogId: number;
    actions: {
        event_type: ActivityLogEventType;
        created_at: Date;
        action_users: number[];
        properties_edited: string[];
        package_ids: number[];
    }[];
}

export function combineNotifications(a: Notification, b: Notification) {
    if (a.catalogNotifications && b.catalogNotifications)
        a.catalogNotifications = a.catalogNotifications.concat(b.catalogNotifications);
    else if (b.catalogNotifications) a.catalogNotifications = b.catalogNotifications;
}
