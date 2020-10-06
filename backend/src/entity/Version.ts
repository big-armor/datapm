import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { BaseModel } from "./BaseModel";
import { Package } from "./Package";
import { VersionIdentifier } from "../generated/graphql";
import { PackageFile } from 'datapm-lib';

@Entity({
  name: "version",
})
@Unique(["packageId", "majorVersion", "minorVersion", "patchVersion"])
export class Version extends BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  majorVersion: number;

  @Column()
  minorVersion: number;

  @Column()
  patchVersion: number;

  // Eager loading for upstream access in the get identifier method
  @ManyToOne(() => Package)
  @JoinColumn({ name: "package_id" })
  package: Package;

  // @ManyToOne(() => User)
  // @JoinColumn({ name: "modified_by" })
  // modifiedBy: User;

  @Column({ name: "package_id" })
  packageId: number;

  // @Column({ name: "modified_by" })
  // modifiedById: number;

  @Column({ nullable: false, default: true })
  isActive: boolean;

  @Column({ length: 2048 })
  description: string;

  @Column({ type: "jsonb", name: "packageFile" })
  packageFile: PackageFile;

  identifier: VersionIdentifier;
}
