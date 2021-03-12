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
            .orderBy(orderBy)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
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
