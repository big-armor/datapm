import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { User } from "./User";
import { Catalog } from "./Catalog";
import { BaseModel } from "./BaseModel";
import { Permission } from "../generated/graphql";

@Entity({
    name: "user_catalog"
})
@Unique(["userId", "catalogId"])
export class UserCatalogPermission extends BaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "catalog_id" })
    catalogId: number;

    @ManyToOne(() => Catalog, { onDelete: "CASCADE" })
    @JoinColumn({ name: "catalog_id" })
    catalog: Catalog;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column("enum", { array: true, name: "permission", enum: Permission })
    permissions: Permission[];
}
