import {
    Entity,
    Column,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    OneToOne,
  } from "typeorm";
  
import { BaseModel } from "./BaseModel";
import { DataType } from "./DataType";
import { Protocol } from "../generated/graphql";


@Entity({
  name: "access",
})
@Unique(["dataTypeId"])
export class Transfer extends BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DataType)
  @JoinColumn({ name: "data_type_id" })
  dataType: DataType;

  @Column({ name: "data_type_id" })
  dataTypeId: number;

  @Column('enum', { name: 'method', enum: Protocol})
  protocol: Protocol;

  @Column({nullable: true, name: "configuration", type: "json"})
  configuration: Object | null;
  

}
  