import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { UserEntity } from "./UserEntity";
import { PackageEntity } from "./PackageEntity";
import { Permission } from "../generated/graphql";
import { EntityBaseModel } from "./EntityBaseModel";

@Entity({
    name: "user_package_permission"
})
@Unique(["userId", "packageId"])
export class UserPackagePermissionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: UserEntity;

    @Column({ name: "package_id" })
    packageId: number;

    @ManyToOne(() => PackageEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @Column("enum", { array: true, name: "permission", enum: Permission })
    permissions: Permission[];

    get username(): string {
        return this.user.username;
    }
}
