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
  import { Version } from "./Version";
import { Attribute } from "./Attribute";
import { Transfer } from "./Transfer";
import { DataTypeIdentifier } from "../generated/graphql";
import { DataTypeStatistics } from "./DataTypeStatistics";
import { Format } from "./Format";
  
  @Entity({
    name: "data_type",
  })
  @Unique(["slug","versionId"])
  export class DataType extends BaseModel {
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
    displayName: string | null
  
    @Column({
      name: "description"
    })
    description: string
  
    @ManyToOne(() => Version)
    @JoinColumn({ name: "version_id" })
    version: Version;
  
    @Column({ name: "version_id" })
    versionId: number;

    @OneToMany(() => Attribute, (attribute) => attribute.dataType, { persistence:true, cascade: true })
    attributes:Attribute[]  

    @OneToOne(() => DataTypeStatistics, (statistics) => statistics.dataType, { cascade: true })
    statistics: DataTypeStatistics;

    @OneToOne(() => Transfer, (access) => access.dataType, { cascade: true })
    transfer: Transfer;

    @OneToOne(() => Format, (format) => format.dataType, { cascade: true })
    format: Format;

    identifier: DataTypeIdentifier;
  
  }
  