import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  Unique
} from "typeorm";
import { BaseModel } from "./BaseModel";

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

}
