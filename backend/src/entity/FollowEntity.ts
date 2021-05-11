import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { NotificationEventType, NotificationFrequency } from "../generated/graphql";
import { CatalogEntity } from "./CatalogEntity";
import { CollectionEntity } from "./CollectionEntity";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageEntity } from "./PackageEntity";
import { PackageIssueEntity } from "./PackageIssueEntity";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "follow"
})
export class FollowEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    public userId: number;

    @Column({
        name: "notification_frequency"
    })
    public notificationFrequency: NotificationFrequency;

    @Column({
        name: "event_types",
        array: true,
        type: "varchar"
    })
    public eventTypes: NotificationEventType[];

    @Column({ name: "target_catalog_id" })
    public catalogId: number;

    @Column({ name: "target_package_id" })
    public packageId: number;

    @Column({ name: "target_collection_id" })
    public collectionId: number;

    @Column({ name: "target_package_issue_id" })
    public packageIssueId: number;

    @Column({ name: "target_user_id" })
    public targetUserId: number;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "user_id" })
    public user: UserEntity;

    @ManyToOne(() => CatalogEntity, { eager: false })
    @JoinColumn({ name: "target_catalog_id" })
    public catalog: CatalogEntity;

    @ManyToOne(() => PackageEntity, { eager: false })
    @JoinColumn({ name: "target_package_id" })
    public package: PackageEntity;

    @ManyToOne(() => CollectionEntity, { eager: false })
    @JoinColumn({ name: "target_collection_id" })
    public collection: CollectionEntity;

    @ManyToOne(() => PackageIssueEntity, { eager: false })
    @JoinColumn({ name: "target_package_issue_id" })
    public packageIssue: PackageIssueEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "target_user_id" })
    public targetUser: UserEntity;
}
