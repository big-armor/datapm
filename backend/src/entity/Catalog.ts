import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { BaseModel } from "./BaseModel";
import { UserCatalogPermission } from "./UserCatalogPermission";
import { Package } from "./Package";
import { CatalogIdentifier, Permission } from "../generated/graphql";
import { Permissions } from "./Permissions";
import { User } from "./User";

@Entity({
    name: "catalog"
})
@Unique(["slug"])
export class Catalog extends BaseModel {
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

    @Column({ type: "text", nullable: true })
    description: string | null;

    @OneToMany(() => UserCatalogPermission, (userCatalogPermission) => userCatalogPermission.catalog, { cascade: true })
    userPermissions: UserCatalogPermission[];

    @OneToMany(() => Package, (packageEntity) => packageEntity.catalog, { cascade: true })
    packages: Package[];

    @ManyToOne(() => User)
    @JoinColumn({ name: "creator_id" })
    creator: User;

    @Column({ name: "creator_id", nullable: false })
    public creatorId: number;

    // These are dummy values so that response objects will have the right values
    // need to write converters for Entity -> GraphQL object
    identifier: CatalogIdentifier;
    myPermissions: Permission[];
}
