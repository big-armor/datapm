import { Column } from "typeorm";

export abstract class BaseModel {
  @Column({ name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ nullable: true, name: "updated_at", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

}
