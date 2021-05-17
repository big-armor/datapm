import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserCatalogPermissionEntity } from "./UserCatalogPermissionEntity";
import { PackageEntity } from "./PackageEntity";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "catalog"
})
@Unique(["slug"])
export class CatalogEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 64 })
    displayName: string;

    @Column({ length: 256 })
    slug: string;

    @Column({ nullable: true })
    website: string;

    @Column()
    isPublic: boolean;

    @Column()
    unclaimed: boolean;

    @Column({ type: "text", nullable: true })
    description: string | null;

    @OneToMany(() => UserCatalogPermissionEntity, (userCatalogPermission) => userCatalogPermission.catalog, {
        cascade: true
    })
    userPermissions: UserCatalogPermissionEntity[];

    @OneToMany(() => PackageEntity, (packageEntity) => packageEntity.catalog, { cascade: true })
    packages: PackageEntity[];

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id", nullable: false })
    public creatorId: number;
}
