import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from "typeorm";
import { Permission } from "../generated/graphql";
import { EntityBaseModel } from "./EntityBaseModel";
import { GroupEntity } from "./GroupEntity";
import { UserEntity } from "./UserEntity";

/** Represents a member of a group */
@Entity({
    name: "group_user"
})
@Unique(["groupId", "userId"])
export class GroupUserEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "user_id" })
    user: UserEntity;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => GroupEntity, { eager: true })
    @JoinColumn({ name: "group_id" })
    group: GroupEntity;

    @Column({ name: "group_id" })
    groupId: number;

    @Column("enum", { array: true, name: "permissions", enum: Permission })
    permissions: Permission[];
}
