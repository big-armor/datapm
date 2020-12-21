import { Entity, Column, PrimaryColumn, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseModel } from "./BaseModel";
import { Permission } from "../generated/graphql";
import { Collection } from "./Collection";
import { User } from "./User";

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

    @ManyToOne(() => Collection)
    @JoinColumn({ name: "collection_id" })
    collection: Collection;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;
}
