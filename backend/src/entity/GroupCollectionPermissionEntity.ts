import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { GroupEntity } from "./GroupEntity";
import { CollectionEntity } from "./CollectionEntity";
import { Permission } from "../generated/graphql";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "group_collection_permissions"
})
@Unique(["groupId", "collectionId"])
export class GroupCollectionPermissionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "group_id" })
    groupId: number;

    @ManyToOne(() => GroupEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "group_id" })
    group: GroupEntity;

    @Column({ name: "collection_id" })
    collectionId: number;

    @ManyToOne(() => CollectionEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "collection_id" })
    collection: CollectionEntity;

    @Column("enum", { array: true, name: "permissions", enum: Permission })
    permissions: Permission[];

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;
}
