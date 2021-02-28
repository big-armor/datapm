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
        offset: number,
        limit: number,
        orderBy: OrderBy = OrderBy.CREATED_AT,
        relations: string[] = []
    ): Promise<[PackageIssueEntity[], number]> {
        const ALIAS = "PackageIssueEntity";
        return this.createQueryBuilder()
            .where('"PackageIssueEntity"."package_id" = :packageId')
            .setParameter("packageId", packageId)
            .offset(offset)
            .limit(limit)
            .orderBy(orderBy)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    public getLastCreatedIssueForPackage(packageId: number): Promise<PackageIssueEntity | undefined> {
        return this.createQueryBuilder()
            .where('"PackageIssueEntity"."package_id" = :packageId')
            .setParameter("packageId", packageId)
            .orderBy(OrderBy.CREATED_AT, "DESC")
            .getOne();
    }
}
