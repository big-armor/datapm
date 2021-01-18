import { Entity, Column, PrimaryColumn, Index, Unique, ManyToOne, JoinColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { CollectionEntity } from "./CollectionEntity";
import { PackageEntity } from "./PackageEntity";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "collection_package"
})
@Index("collectionId")
@Unique(["collectionId", "packageId"])
export class CollectionPackageEntity extends EntityBaseModel {
    @ManyToOne(() => CollectionEntity)
    @JoinColumn({ name: "collection_id" })
    collection: CollectionEntity;

    @PrimaryColumn({ name: "collection_id", nullable: false })
    public collectionId: number;

    @ManyToOne(() => PackageEntity)
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @PrimaryColumn({ name: "package_id", nullable: false })
    public packageId: number;

    @Column({ name: "added_by", nullable: false })
    public addedBy: number;

    @ManyToOne((type) => UserEntity)
    @JoinColumn({ name: "added_by" })
    public addedByUser: UserEntity;
}
