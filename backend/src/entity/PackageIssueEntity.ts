import {
    Entity,
    Column,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    PrimaryColumn,
    OneToOne
} from "typeorm";

import { EntityBaseModel } from "./EntityBaseModel";
import { PackageEntity } from "./PackageEntity";
import { PackageIssueStatus } from "./PackageIssueStatus";
import { UserEntity } from "./UserEntity";

@Entity({ name: "package_issue" })
@Unique(["issueNumber", "packageId"])
export class PackageIssueEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "issue_number" })
    public issueNumber: number;

    @Column({ name: "package_id", nullable: false })
    public packageId: number;

    @Column({ name: "creator_id", nullable: false })
    public creatorId: number;

    @Column({ name: "subject", type: "varchar", length: 255 })
    public subject: string;

    @Column({ name: "content", type: "text" })
    public content: string;

    @Column({ array: false, name: "status" })
    public status: PackageIssueStatus;

    @ManyToOne(() => PackageEntity)
    @JoinColumn({ name: "package_id" })
    public package: PackageEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "creator_id" })
    public creator: UserEntity;
}
