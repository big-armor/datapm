import { PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export abstract class BaseModel {
  @Column({ name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ nullable: true, name: "updated_at", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

}
