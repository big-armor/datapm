/* eslint-disable camelcase */
import { EntityRepository, Repository } from "typeorm";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";
import { OrderBy } from "./OrderBy";

@EntityRepository(PackageIssueEntity)
export class PackageIssueRepository extends Repository<PackageIssueEntity> {
    public async getByIssueNumberForPackage(
        packageId: number,
        issueNumber: number,
        relations: string[] = []
    ): Promise<PackageIssueEntity> {
        const ALIAS = "PackageIssueEntity";
        const issueEntity = await this.createQueryBuilder()
            .where('"PackageIssueEntity"."package_id" = :packageId')
            .andWhere('"PackageIssueEntity"."issue_number" = :issueNumber')
            .setParameter("packageId", packageId)
            .setParameter("issueNumber", issueNumber)
            .addRelations(ALIAS, relations)
            .getOne();

        if (!issueEntity) {
            throw new Error("Issue not found - " + issueNumber);
        }

        return issueEntity;
    }

    public async countIssuesByPackage(
        packageId: number
    ): Promise<
        [
            {
                open_issues_count: number;
                closed_issues_count: number;
            }
        ]
    > {
        return this.manager.query(
            `Select
                (Select COUNT (*) FROM package_issue WHERE package_id = $1 AND status = 'OPEN') as open_issues_count,
                (Select COUNT (*) FROM package_issue WHERE package_id = $1 AND status = 'CLOSED') as closed_issues_count`,
            [packageId]
        );
    }

    public getIssuesByPackage(
        packageId: number,
        includeOpenIssues: boolean,
        includeClosedIssues: boolean,
        offset: number,
        limit: number,
        orderBy: OrderBy = OrderBy.CREATED_AT,
        relations: string[] = []
    ): Promise<[PackageIssueEntity[], number]> {
        const ALIAS = "PackageIssueEntity";

        let queryBuilder = this.createQueryBuilder().where('"PackageIssueEntity"."package_id" = :packageId');

        if (includeOpenIssues && !includeClosedIssues) {
            queryBuilder = queryBuilder.andWhere(`"PackageIssueEntity"."status" = 'OPEN'`);
        } else if (!includeOpenIssues && includeClosedIssues) {
            queryBuilder = queryBuilder.andWhere(`"PackageIssueEntity"."status" = 'CLOSED'`);
        }

        return queryBuilder
            .setParameter("packageId", packageId)
            .offset(offset)
            .limit(limit)
            .orderBy(orderBy, "DESC")
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    public getAllIssuesByPackage(packageId: number): Promise<PackageIssueEntity[]> {
        return this.createQueryBuilder()
            .where('"package_id" = :packageId')
            .setParameter("packageId", packageId)
            .getMany();
    }

    public async getIssueByPackageAndIssueNumber(packageId: number, issueNumber: number): Promise<PackageIssueEntity> {
        const entity = await this.createQueryBuilder()
            .where('"PackageIssueEntity"."package_id" = :packageId')
            .andWhere('"PackageIssueEntity"."issue_number" = :issueNumber')
            .setParameter("packageId", packageId)
            .setParameter("issueNumber", issueNumber)
            .getOne();

        if (!entity) {
            throw new Error("ISSUE_NOT_FOUND");
        }

        return entity;
    }

    public getIssuesByPackageAndIssueNumbers(packageId: number, issueNumbers: number[]): Promise<PackageIssueEntity[]> {
        if (!issueNumbers || issueNumbers.length === 0) {
            return Promise.resolve([]);
        }

        return this.createQueryBuilder()
            .where('"PackageIssueEntity"."package_id" = :packageId')
            .andWhere('"PackageIssueEntity"."issue_number" in (:...issueNumbers)')
            .setParameter("packageId", packageId)
            .setParameter("issueNumbers", issueNumbers)
            .getMany();
    }

    public getLastCreatedIssueForPackage(packageId: number): Promise<PackageIssueEntity | undefined> {
        return this.createQueryBuilder()
            .where('"PackageIssueEntity"."package_id" = :packageId')
            .setParameter("packageId", packageId)
            .orderBy(OrderBy.CREATED_AT, "DESC")
            .getOne();
    }
}
