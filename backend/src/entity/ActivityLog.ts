import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseModel } from "./BaseModel";
import { User } from "./User";
import { Package } from "./Package";
import { Version } from "./Version";
import { Catalog } from "./Catalog";
import { Collection } from "./Collection";
import { ActivityLogEventType } from "./ActivityLogEventType";

@Entity({ name: "activity_log" })
@Index(["userId", "eventType"])
export class ActivityLog extends BaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "user_id", nullable: true })
    public userId?: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    public user: User | null;

    @Column({ name: "event_type", nullable: false })
    public eventType: ActivityLogEventType;

    @Column({ name: "target_package_id", nullable: true })
    public targetPackageId?: number;

    @ManyToOne(() => Package, { onDelete: "CASCADE" })
    @JoinColumn({ name: "target_package_id" })
    public targetPackage: Package | null;

    @Column({ name: "target_package_version_id", nullable: true })
    public targetPackageVersionId?: number;

    @ManyToOne(() => Version, { onDelete: "CASCADE" })
    @JoinColumn({ name: "target_package_version_id" })
    public targetPackageVersion: Version | null;

    @Column({ name: "target_catalog_id", nullable: true })
    public targetCatalogId?: number;

    @ManyToOne(() => Catalog, { onDelete: "CASCADE" })
    @JoinColumn({ name: "target_catalog_id" })
    public targetCatalog: Catalog | null;

    @Column({ name: "target_collection_id", nullable: true })
    public targetCollectionId?: number;

    @ManyToOne(() => Collection, { onDelete: "CASCADE" })
    @JoinColumn({ name: "target_collection_id" })
    public targetCollection: Collection | null;
}
