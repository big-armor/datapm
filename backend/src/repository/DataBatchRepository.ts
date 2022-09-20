import { EntityRepository, EntityManager } from "typeorm";
import { PackageRepository } from "./PackageRepository";
import { Maybe } from "graphql/jsutils/Maybe";
import { DataBatchEntity } from "../entity/DataBatchEntity";
import { SchemaRepositoryStreamIdentifier, BatchRepositoryIdentifier, UpdateMethod } from "datapm-lib";
import { DataStorageService } from "../storage/data/data-storage";

@EntityRepository()
export class DataBatchRepository {
    readonly dataStorageService = DataStorageService.INSTANCE;

    // eslint-disable-next-line no-useless-constructor
    constructor(private manager: EntityManager) {
        // Nothing to do
    }

    public async findBatchOrFail(
        packageId: number,
        majorVersion: number,
        sourceType: string,
        sourceSlug: string,
        streamSetSlug: string,
        streamSlug: string,
        schemaTitle: string,
        batch: number
    ): Promise<DataBatchEntity> {
        const batchEntity = await this.findBatch(
            packageId,
            majorVersion,
            sourceType,
            sourceSlug,
            streamSetSlug,
            streamSlug,
            schemaTitle,
            batch
        );

        if (batchEntity === undefined) {
            throw new Error("BATCH_NOT_FOUND");
        }

        return batchEntity;
    }

    public async findDefaultBatchesForSchema(
        packageId: number,
        majorVersion: number,
        schemaTitle: string,
        relations: string[] = []
    ): Promise<DataBatchEntity[]> {
        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder("BatchEntity")
            .where('"BatchEntity"."package_id" = :packageId')
            .andWhere('"BatchEntity"."major_version" = :majorVersion')
            .andWhere('"BatchEntity"."schematitle" = :schemaTitle')
            .andWhere('"BatchEntity"."default" = true')
            .setParameter("packageId", packageId)
            .setParameter("majorVersion", majorVersion)
            .setParameter("schemaTitle", schemaTitle)
            .addRelations("BatchEntity", relations)
            .getMany();
    }

    public async findDefaultBatchesForPackage(
        packageId: number,
        majorVersion: number,
        relations: string[] = []
    ): Promise<DataBatchEntity[]> {
        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder("BatchEntity")
            .where('"BatchEntity"."package_id" = :packageId')
            .andWhere('"BatchEntity"."major_version" = :majorVersion')
            .andWhere('"BatchEntity"."default" = true')
            .setParameter("packageId", packageId)
            .setParameter("majorVersion", majorVersion)
            .addRelations("BatchEntity", relations)
            .getMany();
    }

    public async findBatch(
        packageId: number,
        majorVersion: number,
        sourceType: string,
        sourceSlug: string,
        streamSetSlug: string,
        streamSlug: string,
        schemaTitle: string,
        batch: number
    ): Promise<DataBatchEntity | undefined> {
        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder("BatchEntity")
            .where('"BatchEntity"."package_id" = :packageId')
            .andWhere('"BatchEntity"."major_version" = :majorVersion')
            .andWhere('"BatchEntity"."sourcetype" = :sourceType')
            .andWhere('"BatchEntity"."sourceslug" = :sourceSlug')
            .andWhere('"BatchEntity"."streamsetslug" = :streamSetSlug')
            .andWhere('"BatchEntity"."streamslug" = :streamSlug')
            .andWhere('"BatchEntity"."schematitle" = :schemaTitle')
            .andWhere('"BatchEntity"."batch" = :batch')
            .setParameter("packageId", packageId)
            .setParameter("majorVersion", majorVersion)
            .setParameter("sourceType", sourceType)
            .setParameter("sourceSlug", sourceSlug)
            .setParameter("streamSetSlug", streamSetSlug)
            .setParameter("streamSlug", streamSlug)
            .setParameter("schemaTitle", schemaTitle)
            .setParameter("batch", batch)
            .getOne();
    }

    async save(
        userId: number,
        identifier: BatchRepositoryIdentifier,
        updateMethod: UpdateMethod
    ): Promise<DataBatchEntity> {
        return await this.manager.nestedTransaction(async (transaction) => {
            const packageEntity = await transaction.getCustomRepository(PackageRepository).findPackageOrFail({
                identifier: {
                    catalogSlug: identifier.catalogSlug,
                    packageSlug: identifier.packageSlug
                }
            });

            const version = transaction.getRepository(DataBatchEntity).create({
                packageId: packageEntity.id,
                schemaTitle: identifier.schemaTitle,
                streamSetSlug: identifier.streamSetSlug,
                sourceType: identifier.sourceType,
                sourceSlug: identifier.sourceSlug,
                streamSlug: identifier.streamSlug,
                majorVersion: identifier.majorVersion,
                batch: identifier.batch,
                updateMethod,
                default: false,
                authorId: userId,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return await transaction.save(version);
        });
    }

    /** This is just the lastes uploaded batch for a stream, it is not
     * necessarily the default batch that is served by the stream
     */
    async findLatestBatch({
        identifier,
        relations = []
    }: {
        identifier: SchemaRepositoryStreamIdentifier;
        relations?: string[];
    }): Promise<Maybe<DataBatchEntity>> {
        const ALIAS = "findLatestBatch";

        const packageObject = await this.manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier });

        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageObject.id })
            .andWhere('"findLatestBatch"."major_version" = :majorVersion')
            .andWhere('"findLatestBatch"."sourcetype" = :sourceType')
            .andWhere('"findLatestBatch"."sourceslug" = :sourceSlug')
            .andWhere('"findLatestBatch"."streamsetslug" = :streamSetSlug')
            .andWhere('"findLatestBatch"."streamslug" = :streamSlug')
            .andWhere('"findLatestBatch"."schematitle" = :schemaTitle')
            .orderBy({
                "findLatestBatch.batch": "DESC"
            })
            .setParameter("majorVersion", identifier.majorVersion)
            .setParameter("sourceType", identifier.sourceType)
            .setParameter("sourceSlug", identifier.sourceSlug)
            .setParameter("streamSetSlug", identifier.streamSetSlug)
            .setParameter("streamSlug", identifier.streamSlug)
            .setParameter("schemaTitle", identifier.schemaTitle)
            .addRelations(ALIAS, relations)
            .getOne();
    }

    async findDefaultBatch({
        identifier,
        relations = []
    }: {
        identifier: SchemaRepositoryStreamIdentifier;
        relations?: string[];
    }): Promise<Maybe<DataBatchEntity>> {
        const ALIAS = "findDefault";

        const packageObject = await this.manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier });

        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageObject.id })
            .andWhere('"findDefault"."major_version" = :majorVersion')
            .andWhere('"findDefault"."sourcetype" = :sourceType')
            .andWhere('"findDefault"."sourceslug" = :sourceSlug')
            .andWhere('"findDefault"."streamsetslug" = :streamSetSlug')
            .andWhere('"findDefault"."streamslug" = :streamSlug')
            .andWhere('"findDefault"."schematitle" = :schemaTitle')
            .andWhere('"findDefault"."default" = true')
            .setParameter("majorVersion", identifier.majorVersion)
            .setParameter("sourceType", identifier.sourceType)
            .setParameter("sourceSlug", identifier.sourceSlug)
            .setParameter("streamSetSlug", identifier.streamSetSlug)
            .setParameter("streamSlug", identifier.streamSlug)
            .setParameter("schemaTitle", identifier.schemaTitle)
            .addRelations(ALIAS, relations)
            .getOne();
    }

    async findDefaultBatchOrFail({
        identifier,
        relations = []
    }: {
        identifier: SchemaRepositoryStreamIdentifier;
        relations?: string[];
    }): Promise<DataBatchEntity> {
        const batch = await this.findDefaultBatch({ identifier, relations });

        if (!batch) {
            throw new Error(
                `BATCH_NOT_FOUND ${identifier.catalogSlug}/${identifier.packageSlug}/${identifier.majorVersion}/${identifier.schemaTitle}/${identifier.streamSlug}`
            );
        }

        return batch;
    }

    async findOneOrFail({
        identifier,
        relations = []
    }: {
        identifier: BatchRepositoryIdentifier;
        relations?: string[];
    }): Promise<DataBatchEntity> {
        const packageEntity = await this.manager.getCustomRepository(PackageRepository).findOrFail({ identifier });

        const batch = await this.manager.getRepository(DataBatchEntity).findOneOrFail({
            where: {
                packageId: packageEntity.id,
                schemaTitle: identifier.schemaTitle,
                streamSlug: identifier.streamSlug,
                majorVersion: identifier.majorVersion,
                batch: identifier.batch
            },
            relations: relations
        });

        if (!batch) {
            throw new Error(
                `BATCH_NOT_FOUND ${identifier.majorVersion}/${identifier.schemaTitle}/${identifier.streamSlug} for package ${packageEntity.id}`
            );
        }

        return batch;
    }

    async findBatches({
        streamIdentifier,
        relations = []
    }: {
        streamIdentifier: SchemaRepositoryStreamIdentifier;
        relations?: string[];
    }): Promise<DataBatchEntity[]> {
        const ALIAS = "batchesByPackageVersion";

        const packageEntity = await this.manager
            .getCustomRepository(PackageRepository)
            .findOrFail({ identifier: streamIdentifier });

        const batches = await this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageEntity.id })
            .andWhere('"DataBatchEntity"."majorVersion" = :majorVersion')
            .andWhere('"DataBatchEntity"."sourcetype" = :sourceType')
            .andWhere('"DataBatchEntity"."sourceslug" = :sourceSlug')
            .andWhere('"DataBatchEntity"."streamsetslug" = :streamSetSlug')
            .andWhere('"DataBatchEntity"."streamSlug" = :streamSlug')
            .andWhere('"DataBatchEntity"."schematitle" = :schemaTitle')
            .addRelations(ALIAS, relations)
            .setParameter("majorVersion", streamIdentifier.majorVersion)
            .setParameter("sourceType", streamIdentifier.sourceType)
            .setParameter("sourceSlug", streamIdentifier.sourceSlug)
            .setParameter("streamSetSlug", streamIdentifier.streamSetSlug)
            .setParameter("streamSlug", streamIdentifier.streamSlug)
            .setParameter("schemaTitle", streamIdentifier.schemaTitle)
            .orderBy({
                "DataBatchEntity.batch": "DESC"
            })
            .getMany();

        return batches;
    }

    async findBatchesWithLimitAndOffset(
        streamIdentifier: SchemaRepositoryStreamIdentifier,
        offset: number,
        limit: number,
        relations?: string[]
    ): Promise<DataBatchEntity[]> {
        const ALIAS = "versionsByPackageId";

        const packageEntity = await this.manager
            .getCustomRepository(PackageRepository)
            .findOrFail({ identifier: streamIdentifier });

        const batches = await this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageEntity.id })
            .andWhere('"DataBatchEntity"."majorVersion" = :majorVersion')
            .andWhere('"DataBatchEntity"."sourcetype" = :sourceType')
            .andWhere('"DataBatchEntity"."sourceslug" = :sourceSlug')
            .andWhere('"DataBatchEntity"."streamsetslug" = :streamSetSlug')
            .andWhere('"DataBatchEntity"."streamslug" = :streamSlug')
            .andWhere('"DataBatchEntity"."schematitle" = :schemaTitle')
            .addRelations(ALIAS, relations)
            .setParameter("majorVersion", streamIdentifier.majorVersion)
            .setParameter("sourceType", streamIdentifier.sourceType)
            .setParameter("streamSetSlug", streamIdentifier.streamSetSlug)
            .setParameter("streamSlug", streamIdentifier.streamSlug)
            .setParameter("schemaTitle", streamIdentifier.schemaTitle)
            .offset(offset)
            .limit(limit)
            .orderBy({
                "DataBatchEntity.batch": "DESC"
            })
            .getMany();

        return batches;
    }

    async deleteBatches(batches: DataBatchEntity[]): Promise<void> {
        if (batches.length === 0) return;

        for (const batch of batches) {
            try {
                await this.dataStorageService.deleteBatch(batch.id);
            } catch (error) {
                if (error.message.includes("FILE_DOES_NOT_EXIST")) continue;

                console.error(error.message);
            }
        }

        await this.manager.nestedTransaction(async (transaction) => {
            for (const batch of batches) await transaction.delete(DataBatchEntity, { id: batch.id });
        });
    }
}
