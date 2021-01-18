import { Entity, Column, PrimaryColumn, Index, JoinColumn, ManyToOne } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { Permission } from "../generated/graphql";
import { CollectionEntity } from "./CollectionEntity";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "collection_user"
})
@Index("userId")
@Index(["userId", "collectionId"], { unique: true })
export class UserCollectionPermissionEntity extends EntityBaseModel {
    @PrimaryColumn({ name: "user_id", nullable: false })
    public userId: number;

    @PrimaryColumn({ name: "collection_id", nullable: false })
    public collectionId: number;

    @Column("enum", { array: true, name: "permissions", enum: Permission, nullable: false })
    public permissions: Permission[];

    @ManyToOne(() => CollectionEntity)
    @JoinColumn({ name: "collection_id" })
    collection: CollectionEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "user_id" })
    user: UserEntity;
}
