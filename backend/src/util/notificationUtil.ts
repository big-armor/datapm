/* eslint-disable camelcase */
import { ActivityLogEventType } from "../generated/graphql";

export interface Notification {
    userId: number;
    catalogNotifications?: CatalogNotification[];
    packageNotifications?: PackageNotification[];
    collectionNotifications?: CollectionNotification[];
    userNotifications?: UserNotification[];
}

export interface UserNotification {
    userId: number;
    pending_notifications: {
        actions: {
            user_id: number;
            created_at: string[];
            package_id: number | null;
            package_version_id: number | null;
            properties_edited: string[] | null;
            change_type: string;
        }[];
        event_type: ActivityLogEventType;
        properties_edited: string[];
    }[];
}

export interface CollectionNotification {
    collectionId: number;
    pending_notifications: {
        actions: {
            user_id: number;
            created_at: string[];
            package_id: number | null;
            properties_edited: string[] | null;
            change_type: string;
        }[];
        event_type: ActivityLogEventType;
        properties_edited: string[];
    }[];
}

export interface CatalogNotification {
    catalogId: number;
    pending_notifications: {
        actions: {
            user_id: number;
            created_at: string[];
            package_id: number | null;
            properties_edited: string[] | null;
            change_type: string;
        }[];
        event_type: ActivityLogEventType;
        properties_edited: string[];
    }[];
}

export interface PackageNotification {
    packageId: number;
    pending_notifications: {
        actions: {
            user_id: number;
            created_at: string[];
            package_version_id: number | null;
            properties_edited: string[] | null;
            change_type: string;
        }[];
        event_type: ActivityLogEventType;
        properties_edited: string[];
    }[];
}

export function combineNotifications(a: Notification, b: Notification): void {
    if (a.catalogNotifications && b.catalogNotifications)
        a.catalogNotifications = a.catalogNotifications.concat(b.catalogNotifications);
    else if (b.catalogNotifications) a.catalogNotifications = b.catalogNotifications;

    if (a.packageNotifications && b.packageNotifications)
        a.packageNotifications = a.packageNotifications.concat(b.packageNotifications);
    else if (b.packageNotifications) a.packageNotifications = b.packageNotifications;

    if (a.collectionNotifications && b.collectionNotifications)
        a.collectionNotifications = a.collectionNotifications.concat(b.collectionNotifications);
    else if (b.collectionNotifications) a.collectionNotifications = b.collectionNotifications;
}
