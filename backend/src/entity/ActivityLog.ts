import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Package } from "./Package";
import { Version } from "../generated/graphql";
import { Catalog } from "./Catalog";
import { Collection } from "./Collection";
import { ActivityLogEventType } from "./ActivityLogEventType";

@Entity({ name: "activity_log" })
@Index("event_type")
export class ActivityLog {
    @PrimaryGeneratedColumn({ name: "id", type: "integer" })
    public id: number;

    @Column({ name: "user" })
    public userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user" })
    public user: User;

    @Column({ name: "event_type", nullable: false })
    public eventType: ActivityLogEventType;

    @Column({ name: "target_package_id" })
    public targetPackageId: number;

    @ManyToOne(() => Package)
    @JoinColumn({ name: "target_package_id" })
    public targetPackage: Package;

    @Column({ name: "target_package_version_id" })
    public targetPackageVersionId: number;

    @JoinColumn({ name: "target_package_version_id" })
    targetPackageVersion: Version;

    @Column({ name: "target_catalog_id" })
    public targetCatalogId: number;

    @ManyToOne(() => Catalog)
    @JoinColumn({ name: "target_catalog_id" })
    public targetCatalog: Catalog;

    @Column({ name: "target_collection_id" })
    public targetCollectionId: number;

    @ManyToOne(() => Collection)
    @JoinColumn({ name: "target_collection_id" })
    public targetCollection: Collection;

    @CreateDateColumn({ name: "created_at", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;
}
