import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { GroupEntity } from "./GroupEntity";
import { PackageEntity } from "./PackageEntity";
import { Permission } from "../generated/graphql";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "group_package_permissions"
})
@Unique(["groupId", "packageId"])
export class GroupPackagePermissionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "group_id" })
    groupId: number;

    @ManyToOne(() => GroupEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "group_id" })
    group: GroupEntity;

    @Column({ name: "package_id" })
    packageId: number;

    @ManyToOne(() => PackageEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @Column("enum", { array: true, name: "permissions", enum: Permission })
    permissions: Permission[];

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;
}
