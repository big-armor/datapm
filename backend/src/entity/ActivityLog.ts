import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseModel } from "./BaseModel";
import { User } from "./User";
import { Package } from "./Package";
import { Version } from "../generated/graphql";
import { Catalog } from "./Catalog";
import { Collection } from "./Collection";
import { ActivityLogEventType } from "./ActivityLogEventType";

@Entity({ name: "activity_log" })
@Index("event_type")
export class ActivityLog extends BaseModel {
    @PrimaryGeneratedColumn({ name: "id", type: "integer" })
    public id: number;

    @Column({ name: "user_id", nullable: true })
    public userId?: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user" })
    public user: User | null;

    @Column({ name: "event_type", nullable: false })
    public eventType: ActivityLogEventType;

    @Column({ name: "target_package_id", nullable: true })
    public targetPackageId?: number;

    @ManyToOne(() => Package)
    @JoinColumn({ name: "target_package_id" })
    public targetPackage: Package | null;

    @Column({ name: "target_package_version_id", nullable: true })
    public targetPackageVersionId?: number;

    @JoinColumn({ name: "target_package_version_id" })
    targetPackageVersion: Version | null;

    @Column({ name: "target_catalog_id", nullable: true })
    public targetCatalogId?: number;

    @ManyToOne(() => Catalog)
    @JoinColumn({ name: "target_catalog_id" })
    public targetCatalog: Catalog | null;

    @Column({ name: "target_collection_id", nullable: true })
    public targetCollectionId?: number;

    @ManyToOne(() => Collection)
    @JoinColumn({ name: "target_collection_id" })
    public targetCollection: Collection | null;
}
