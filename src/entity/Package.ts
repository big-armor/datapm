import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { BaseModel } from "./BaseModel";
import { Catalog } from "./Catalog";
import { Version } from "./Version";
import { PackageIdentifier } from "../generated/graphql";
import { getEnvVariable } from "../util/getEnvVariable";

@Entity({
  name: "package",
})
@Unique(["slug","catalogId"])
export class Package extends BaseModel {
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
  displayName: string

  @Column({
    name: "description"
  })
  description: string

  @ManyToOne(() => Catalog)
  @JoinColumn({ name: "catalog_id" })
  catalog: Catalog;

  @Column({ name: "catalog_id" })
  catalogId: number;

  @Column({nullable: false, default: true})
  isActive: boolean;

  @Column({nullable: false, default: false})
  isPublic: boolean;

  @OneToMany(() => Version, (version) => version.package, { })
  @JoinColumn({ name: "catalog_id" })
  versions: Version[];


  identifier: PackageIdentifier 

}
