import { Entity, Column, PrimaryColumn, Index, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { CollectionIdentifier, Permission } from "../generated/graphql";
import { UserEntity } from "./UserEntity";

import { EntityBaseModel } from "./EntityBaseModel";

@Entity("collection")
@Index("name")
@Index("slug")
@Index("isPublic")
@Index("isRecommended")
export class CollectionEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn({ name: "id", type: "integer" })
    public id: number;

    @Column({ nullable: true, name: "name", length: 256, type: "varchar" })
    public name: string;

    @Column({ nullable: false, name: "slug", length: 256, type: "varchar", unique: true })
    public collectionSlug: string;

    @Column({ name: "description", nullable: true, type: "text" })
    public description: string | null | undefined;

    @Column({ name: "is_public", nullable: false, default: false })
    public isPublic: boolean;

    @Column({ name: "is_recommended", nullable: false, default: false })
    public isRecommended: boolean;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id", nullable: false })
    public creatorId: number;
}
