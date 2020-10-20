import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseModel } from "./BaseModel";
import { Permission } from "../generated/graphql";

@Entity({
    name: "collection_user"
})
@Index("userId")
@Index(["userId", "collectionId"], { unique: true })
export class UserCollectionPermission extends BaseModel {
    @PrimaryColumn({ name: "user_id", nullable: false })
    public userId: number;

    @PrimaryColumn({ name: "collection_id", nullable: false })
    public collectionId: number;

    @Column("enum", { array: true, name: "permissions", enum: Permission, nullable: false })
    public permissions: Permission[];
}
