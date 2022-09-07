import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { UserEntity } from "./UserEntity";
import { CatalogEntity } from "./CatalogEntity";
import { EntityBaseModel } from "./EntityBaseModel";
import { Permission } from "../generated/graphql";

@Entity({
    name: "user_catalog"
})
@Unique(["userId", "catalogId"])
export class UserCatalogPermissionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "catalog_id" })
    catalogId: number;

    @ManyToOne(() => CatalogEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "catalog_id" })
    catalog: CatalogEntity;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: UserEntity;

    @Column("enum", { array: true, name: "permission", enum: Permission })
    permissions: Permission[];

    @Column("enum", { array: true, name: "package_permissions", enum: Permission })
    packagePermissions: Permission[];
}
