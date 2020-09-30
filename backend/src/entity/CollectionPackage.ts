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
import { User } from "./User";

@Entity({
  name: "collection_package",
})
@Index("collectionId")
@Unique(["collectionId", "packageId"])
export class CollectionPackage extends BaseModel {

  @PrimaryColumn({ name: "collection_id", nullable: false })
  public collectionId: number;

  @PrimaryColumn({ name: "package_id", nullable: false })
  public packageId: number;

  @Column({ name: "added_by", nullable: false })
  public addedBy: number;

  @ManyToOne(type => User)
  @JoinColumn({ name: "added_by" })
  public addedByUser: User;

}
