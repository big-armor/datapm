import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Unique,
} from "typeorm";
import { User } from "./User";
import { Package } from "./Package";
import { Permission } from "../generated/graphql";
import { BaseModel } from "./BaseModel";

@Entity({
  name: "user_package_permission",
})
@Unique(["userId", "packageId"])
export class UserPackagePermission extends BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "package_id" })
  packageId: number;

  @ManyToOne(() => Package, { onDelete: "CASCADE" })
  @JoinColumn({ name: "package_id" })
  package: Package;

  @Column('enum', { array: true, name: 'permission', enum: Permission})
  permissions: Permission[];

  get username(): string {
      return this.user.username;
  }

  
}
