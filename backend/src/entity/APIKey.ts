import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from "typeorm";
import { BaseModel } from "./BaseModel";
import { User } from "./User";
import { Scope } from "../generated/graphql";

@Entity({
    name: "apiKey"
})
@Unique(["id"])
export class APIKey extends BaseModel {
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

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column("enum", { array: true, name: "scopes", enum: Scope })
    scopes: Scope[];
}
