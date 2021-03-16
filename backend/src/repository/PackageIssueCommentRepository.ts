import { EntityRepository, Repository } from "typeorm";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
import { OrderBy } from "./OrderBy";

@EntityRepository(IssueCommentEntity)
export class PackageIssueCommentRepository extends Repository<IssueCommentEntity> {
    public getCommentsByIssue(
        issueId: number,
        offset: number,
        limit: number,
        orderBy: OrderBy,
        relations?: string[]
    ): Promise<[IssueCommentEntity[], number]> {
        const ALIAS = "IssueCommentEntity";
        return this.createQueryBuilder()
            .where('"IssueCommentEntity"."issue_id" = :issueId')
            .setParameter("issueId", issueId)
            .offset(offset)
            .limit(limit)
            .orderBy(orderBy)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    public getCommentByIssueIdAndCommentNumber(
        issueId: number,
        commentNumber: number
    ): Promise<IssueCommentEntity | undefined> {
        return this.createQueryBuilder()
            .where('"IssueCommentEntity"."issue_id" = :issueId')
            .andWhere('"IssueCommentEntity"."comment_number" = :commentNumber')
            .setParameter("issueId", issueId)
            .setParameter("commentNumber", commentNumber)
            .orderBy(OrderBy.CREATED_AT, "DESC")
            .getOne();
    }

    public getLastCreatedCommentForIssue(issueId: number): Promise<IssueCommentEntity | undefined> {
        return this.createQueryBuilder()
            .where('"IssueCommentEntity"."issue_id" = :issueId')
            .setParameter("issueId", issueId)
            .orderBy(OrderBy.CREATED_AT, "DESC")
            .getOne();
    }
}
