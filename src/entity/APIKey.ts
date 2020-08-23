import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    Unique,
    ManyToOne,
    JoinColumn,
  } from "typeorm";
  import { BaseModel } from "./BaseModel";
import { User } from "./User";
  
@Entity({
  name: "apiKey",
})
@Unique(["key"])
export class APIKey extends BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: "last_login", type: "timestamptz" })
  lastUsed: Date | null;

  @Column({ length: 64, name: "key", type: "varchar" })
  key: string;

  @Column({ length: 64, name: "secret", type: "varchar", select: false })
  secret: string;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  
}
  