import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, PrimaryColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageIssueEntity } from "./PackageIssueEntity";
import { UserEntity } from "./UserEntity";

@Entity({ name: "issue_comment" })
@Unique(["commentId", "issueId"])
export class IssueCommentEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "comment_id" })
    public commentId: number;

    @PrimaryColumn({ name: "issue_id", nullable: false })
    public issueId: number;

    @Column({ name: "creator_id", nullable: false })
    public creatorId: number;

    @Column({ name: "content", type: "text" })
    public content: string;

    @ManyToOne(() => PackageIssueEntity)
    @JoinColumn({ name: "issue_id" })
    public packageIssue: PackageIssueEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "creator_id" })
    public creator: UserEntity;
}
