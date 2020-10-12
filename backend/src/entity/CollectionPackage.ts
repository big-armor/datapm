import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { BaseModel } from "./BaseModel";
import { Collection } from "./Collection";
import { Package } from "./Package";
import { User } from "./User";

@Entity({
  name: "collection_package",
})
@Index("collectionId")
@Unique(["collectionId", "packageId"])
export class CollectionPackage extends BaseModel {


  @ManyToOne(() => Collection)
  @JoinColumn({ name: "collection_id" })
  collection: Collection;

  @PrimaryColumn({ name: "collection_id", nullable: false })
  public collectionId: number;

  @ManyToOne(() => Package)
  @JoinColumn({ name: "package_id" })
  package: Package;

  @PrimaryColumn({ name: "package_id", nullable: false })
  public packageId: number;

  @Column({ name: "added_by", nullable: false })
  public addedBy: number;

  @ManyToOne(type => User)
  @JoinColumn({ name: "added_by" })
  public addedByUser: User;

}
