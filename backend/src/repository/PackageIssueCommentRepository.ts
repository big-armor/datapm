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
            .where('"IssueComment"."issueId" = :issueId')
            .setParameter("issueId", issueId)
            .offset(offset)
            .limit(limit)
            .orderBy(orderBy)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    public getLastCreatedCommentForIssue(issueId: number): Promise<IssueCommentEntity | undefined> {
        return this.createQueryBuilder()
            .where('"IssueCommentEntity"."issue_id" = :issueId')
            .setParameter("issueId", issueId)
            .orderBy(OrderBy.CREATED_DATE, "DESC")
            .getOne();
    }
}
