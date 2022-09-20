import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { UpdateMethod } from "../generated/graphql";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageEntity } from "./PackageEntity";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "version"
})
@Unique(["packageId", "majorVersion", "minorVersion", "patchVersion"])
export class VersionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    majorVersion: number;

    @Column()
    minorVersion: number;

    @Column()
    patchVersion: number;

    // Eager loading for upstream access in the get identifier method
    @ManyToOne(() => PackageEntity, { eager: true })
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "author_id" })
    author: UserEntity;

    @Column({ name: "package_id" })
    packageId: number;

    @Column({ name: "author_id" })
    authorId: number;

    @Column({ length: 250 })
    description: string;

    @Column({ name: "update_methods", type: "jsonb", array: true, default: () => "'[]'::jsonb", nullable: false })
    updateMethods: UpdateMethod[];
}
