import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserEntity } from "./UserEntity";
import { Scope } from "../generated/graphql";

@Entity({
    name: "apiKey"
})
@Unique(["id"])
export class APIKeyEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ length: 100, name: "label", type: "varchar" })
    label: string;

    @Column({ nullable: true, name: "last_login", type: "timestamptz" })
    lastUsed: Date | null;

    @Column({ length: 64, name: "hash", type: "varchar", select: false })
    hash?: string;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: UserEntity;

    @Column("enum", { array: true, name: "scopes", enum: Scope })
    scopes: Scope[];
}
