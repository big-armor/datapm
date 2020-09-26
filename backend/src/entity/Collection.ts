import { Entity, Column, PrimaryColumn, Index, PrimaryGeneratedColumn } from "typeorm";
import { CollectionIdentifier } from "../generated/graphql";

import { BaseModel } from "./BaseModel";

@Entity()
@Index("name")
@Index("slug")
@Index("isPublic")
@Index("isActive")
@Index("isRecommended")
export class Collection extends BaseModel {

  @PrimaryGeneratedColumn({ name: "id", type: "integer" })
  public id: number;

  @Column({ nullable: true, name: "name", length: 256, type: "varchar" })
  public name: string;

  @Column({ nullable: false, name: "slug", length: 256, type: "varchar", unique: true})
  public collectionSlug: string;

  @Column({ name: "description", nullable: true, type: "text" })
  public description: string | null | undefined;

  @Column({ name: "is_public", nullable: false, default: false })
  public isPublic: boolean;

  @Column({ name: "is_active", nullable: false, default: true })
  public isActive: boolean;

  @Column({ name: "is_recommended", nullable: false, default: false })
  public isRecommended: boolean;

  public identifier: CollectionIdentifier;

}
