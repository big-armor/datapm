import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "group"
})
@Unique(["slug"])
export class GroupEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 256, name: "name", type: "varchar", nullable: false })
    name: string;

    @Column({ name: "description", type: "text", nullable: false })
    description: string;

    @Column({ length: 256, name: "slug", type: "varchar", nullable: false })
    slug: string;

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;

    @Column({ name: "is_admin" })
    isAdmin: boolean;
}
