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
  name: "dataTypeStatistics",
})
@Unique(["dataTypeId"])
export class DataTypeStatistics extends BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DataType)
  @JoinColumn({ name: "data_type_id" })
  dataType: DataType;

  @Column({ name: "data_type_id" })
  dataTypeId: number;

  @Column({name: "recordCount", type: "bigint"})
  recordCount: number;

  @Column({name: "recordCountApproximate"})
  recordCountApproximate: boolean;

  @Column({name: "byteCount", type: "bigint"})
  byteCount: number;

  @Column({name: "byteCountApproximate"})
  byteCountApproximate: boolean;

}
  