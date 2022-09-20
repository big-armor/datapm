import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { GroupEntity } from "./GroupEntity";
import { CatalogEntity } from "./CatalogEntity";
import { Permission } from "../generated/graphql";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "group_catalog_permissions"
})
@Unique(["groupId", "catalogId"])
export class GroupCatalogPermissionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "group_id" })
    groupId: number;

    @ManyToOne(() => GroupEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "group_id" })
    group: GroupEntity;

    @Column({ name: "catalog_id" })
    catalogId: number;

    @ManyToOne(() => CatalogEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "catalog_id" })
    catalog: CatalogEntity;

    @Column("enum", { array: true, name: "permissions", enum: Permission })
    permissions: Permission[];

    @Column("enum", { array: true, name: "package_permissions", enum: Permission })
    packagePermissions: Permission[];

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;
}
