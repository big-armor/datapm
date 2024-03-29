import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, PrimaryColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageIssueEntity } from "./PackageIssueEntity";
import { UserEntity } from "./UserEntity";

@Entity({ name: "issue_comment" })
@Unique(["commentNumber", "issueId"])
export class IssueCommentEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "comment_number" })
    public commentNumber: number;

    @Column({ name: "issue_id", nullable: false })
    public issueId: number;

    @Column({ name: "author_id", nullable: false })
    public authorId: number;

    @Column({ name: "content", type: "text" })
    public content: string;

    @ManyToOne(() => PackageIssueEntity)
    @JoinColumn({ name: "issue_id" })
    public packageIssue: PackageIssueEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "author_id" })
    public author: UserEntity;
}
