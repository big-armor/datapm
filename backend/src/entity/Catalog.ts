import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany } from "typeorm";
import { BaseModel } from "./BaseModel";
import { UserCatalogPermission } from "./UserCatalogPermission";
import { Package } from "./Package";
import { CatalogIdentifier } from "../generated/graphql";

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

    identifier: CatalogIdentifier;
}
