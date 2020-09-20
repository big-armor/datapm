import { Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export abstract class BaseModel {
  
  @CreateDateColumn({ name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ nullable: true, name: "updated_at", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

}
