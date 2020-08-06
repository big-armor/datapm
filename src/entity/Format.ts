import {
    Entity,
    Column,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
  } from "typeorm";
  
import { BaseModel } from "./BaseModel";
import { DataType } from "./DataType";


@Entity({
  name: "format",
})
@Unique(["dataTypeId"])
export class Format extends BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DataType)
  @JoinColumn({ name: "data_type_id" })
  dataType: DataType;

  @Column({ name: "data_type_id" })
  dataTypeId: number;

  @Column({name: "mimeType"})
  mimeType: string;

  @Column({nullable: true, name: "configuration", type: "json"})
  configuration: Object | null

}
  