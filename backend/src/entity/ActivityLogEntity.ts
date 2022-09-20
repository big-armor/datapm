import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserEntity } from "./UserEntity";
import { PackageEntity } from "./PackageEntity";
import { VersionEntity } from "./VersionEntity";
import { CatalogEntity } from "./CatalogEntity";
import { CollectionEntity } from "./CollectionEntity";
import { ActivityLogChangeType, ActivityLogEventType } from "../generated/graphql";
import { PackageIssueEntity } from "./PackageIssueEntity";
import { DataBatchEntity } from "./DataBatchEntity";
import { GroupEntity } from "./GroupEntity";

@Entity({ name: "activity_log" })
@Index(["userId", "eventType"])
export class ActivityLogEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "user_id", nullable: true })
    public userId?: number;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "user_id" })
    public user: UserEntity | null;

    @Column({ name: "event_type", nullable: false })
    public eventType: ActivityLogEventType;

    @Column({ name: "change_type", nullable: false })
    public changeType?: ActivityLogChangeType;

    @Column({ name: "target_user_id", nullable: true })
    public targetUserId?: number;

    @Column({ name: "target_package_id", nullable: true })
    public targetPackageId?: number;

    @Column({ name: "removed_item_name", nullable: true })
    public removedItemName?: string;

    @Column({ name: "removed_item_id", nullable: true })
    public removedItemId?: number;

    @Column({ name: "target_package_issue_id", nullable: true })
    public targetPackageIssueId?: number;

    @ManyToOne(() => PackageEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_package_id" })
    public targetPackage: PackageEntity | null;

    @ManyToOne(() => PackageIssueEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_package_issue_id" })
    public targetPackageIssue: PackageIssueEntity | null;

    @Column({ name: "target_package_version_id", nullable: true })
    public targetPackageVersionId?: number;

    @ManyToOne(() => VersionEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_package_version_id" })
    public targetPackageVersion: VersionEntity | null;

    @Column({ name: "target_catalog_id", nullable: true })
    public targetCatalogId?: number;

    @ManyToOne(() => CatalogEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_catalog_id" })
    public targetCatalog: CatalogEntity | null;

    @Column({ name: "target_collection_id", nullable: true })
    public targetCollectionId?: number;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_user_id" })
    public targetUser: UserEntity | null;

    @Column({ name: "target_group_id", nullable: true })
    public targetGroupId?: number;

    @ManyToOne(() => GroupEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_group_id" })
    public targetGroup: GroupEntity | null;

    @Column({ name: "target_data_batch_id", nullable: true })
    public targetDataBatchId?: number;

    @ManyToOne(() => PackageEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_data_batch_id" })
    public targetDataBatch?: DataBatchEntity | null;

    @ManyToOne(() => CollectionEntity, { onDelete: "CASCADE", eager: true })
    @JoinColumn({ name: "target_collection_id" })
    public targetCollection: CollectionEntity | null;

    @Column({ name: "properties_edited", array: true, type: "text" })
    public propertiesEdited?: string[];

    @Column({ name: "permissions", array: true, type: "text" })
    public permissions?: string[];

    @Column({
        name: "additional_properties",
        type: "jsonb",
        array: false,
        default: () => "'{}'::jsonb",
        nullable: false
    })
    public additionalProperties?: { [key: string]: unknown };

    // The following are not persisted to the database
    // but are used during logging to the console.
    public targetPackageIdentifier?: string;
    public targetVersionNumber?: string;
    public targetCatalogSlug?: string;
    public targetGroupSlug?: string;
    public targetCollectionSlug?: string;
    public username?: string;
    public targetUsername?: string;
    public targetBatchNumber?: number;
}
