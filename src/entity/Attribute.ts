import {
    Entity,
    Column,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    OneToMany,
    OneToOne,
  } from "typeorm";
  
  import { BaseModel } from "./BaseModel";
import { DataType } from "./DataType";
import { ValueType, AttributeIdentifier } from "../generated/graphql";
import { ValueTypeStats } from "./ValueTypeStats";

  
  @Entity({
    name: "attribute",
  })
  @Unique(["slug","dataTypeId"])
  export class Attribute extends BaseModel {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({
      nullable: true,
      name: "slug",
      length: 256,
      type: "varchar",
    })
    slug: string
  
    @Column({
      nullable: true,
      name: "displayName",
      length: 256,
      type: "varchar",
    })
    displayName?: string | null
  
    @Column({
      nullable: true,
      name: "description",
      default: "Description not provided",
      type: "text"
    })
    description?: string | null
  
    @ManyToOne(() => DataType)
    @JoinColumn({ name: "data_type_id" })
    dataType: DataType;
  
    @Column({ name: "data_type_id" })
    dataTypeId: number;
  
    @Column('enum', { array: true, name: 'value_types', enum: ValueType})
    valueTypes: ValueType[]

    @OneToMany(() => ValueTypeStats, (valueTypeStats) => valueTypeStats.attribute, {nullable:true, cascade: true })
    valueTypeStats: ValueTypeStats[] | null;

    @Column()
    isList: boolean

    identifier: AttributeIdentifier;


  }
  