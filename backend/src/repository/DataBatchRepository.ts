import { EntityRepository, EntityManager } from "typeorm";
import { PackageRepository } from "./PackageRepository";
import { Maybe } from "graphql/jsutils/Maybe";
import { DataBatchEntity } from "../entity/DataBatchEntity";
import { StreamIdentifier, BatchIdentifier } from "datapm-lib";
import { DataStorageService } from "../storage/data/data-storage";

@EntityRepository()
export class DataBatchRepository {
    readonly dataStorageService = DataStorageService.INSTANCE;

    constructor(private manager: EntityManager) {}



    
    public async findBatchOrFail(
        packageId: number,
        majorVersion: number,
        schemaTitle: string,
        streamSlug: string,
        batch:number
    ): Promise<DataBatchEntity> {
        
        const batchEntity = await this.findBatch(packageId, majorVersion, schemaTitle, streamSlug, batch);

        if(batchEntity === undefined) {
            throw new Error("BATCH_NOT_FOUND");
        }

        return batchEntity;
    }


    public async findDefaultBatchesForSchema(
        packageId: number,
        majorVersion: number,
        schemaTitle: string
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
            .getMany();
    }

    public async findBatch(
        packageId: number,
        majorVersion: number,
        schemaTitle: string,
        streamSlug: string,
        batch:number
    ): Promise<DataBatchEntity | undefined> {
        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder("BatchEntity")
            .where('"BatchEntity"."package_id" = :packageId')
            .andWhere('"BatchEntity"."major_version" = :majorVersion')
            .andWhere('"BatchEntity"."schematitle" = :schemaTitle')
            .andWhere('"BatchEntity"."streamslug" = :streamSlug')
            .andWhere('"BatchEntity"."batch" = :batch')
            .setParameter("packageId", packageId)
            .setParameter("majorVersion", majorVersion)
            .setParameter("schemaTitle", schemaTitle)
            .setParameter("streamSlug", streamSlug)
            .setParameter("batch", batch)
            .getOne();
    }

    async save(userId: number, identifier: BatchIdentifier) {
        return await this.manager.nestedTransaction(async (transaction) => {

            const packageEntity = await transaction.getCustomRepository(PackageRepository).findPackageOrFail({
                identifier: {
                    catalogSlug: identifier.catalogSlug,
                    packageSlug: identifier.packageSlug
                }
            });

            let version = transaction.getRepository(DataBatchEntity).create({
                packageId: packageEntity.id,
                schemaTitle: identifier.schemaTitle,
                streamSlug: identifier.streamSlug,
                majorVersion: identifier.majorVersion,
                batch: identifier.batch,
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
        identifier: StreamIdentifier;
        relations?: string[];
    }): Promise<Maybe<DataBatchEntity>> {
        const ALIAS = "findLatestBatch";

        const packageObject = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageObject.id })
            .andWhere('"findLatestBatch"."major_version" = :majorVersion')
            .andWhere('"findLatestBatch"."schematitle" = :schemaTitle')
            .andWhere('"findLatestBatch"."streamslug" = :streamSlug')
            .orderBy({
                "findLatestBatch.batch": "DESC"
            })
            .setParameter("majorVersion", identifier.majorVersion)
            .setParameter("schemaTitle", identifier.schemaTitle)
            .setParameter("streamSlug", identifier.streamSlug)
            .addRelations(ALIAS, relations)
            .getOne();
    }


    async findDefaultBatch({
        identifier,
        relations = []
    }: {
        identifier: StreamIdentifier;
        relations?: string[];
    }): Promise<Maybe<DataBatchEntity>> {
        const ALIAS = "findDefault";

        const packageObject = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

        return this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageObject.id })
            .andWhere('"findDefault"."major_version" = :majorVersion')
            .andWhere('"findDefault"."schematitle" = :schemaTitle')
            .andWhere('"findDefault"."streamslug" = :streamSlug')
            .andWhere('"findDefault"."default" = true')
            .setParameter("majorVersion", identifier.majorVersion)
            .setParameter("schemaTitle", identifier.schemaTitle)
            .setParameter("streamSlug", identifier.streamSlug)
            .addRelations(ALIAS, relations)
            .getOne();
    }

    async findDefaultBatchOrFail({
        identifier,
        relations = []
    }: {
        identifier: StreamIdentifier;
        relations?: string[];
    }): Promise<DataBatchEntity> {
        
        const batch = await this.findDefaultBatch({identifier, relations});

        if(!batch) {
            throw new Error(`BATCH_NOT_FOUND ${identifier.catalogSlug}/${identifier.packageSlug}/${identifier.majorVersion}/${identifier.schemaTitle}/${identifier.streamSlug}`
            );
        }

        return batch;
    }

    async findOneOrFail({
        identifier,
        relations = []
    }: {
        identifier: BatchIdentifier;
        relations?: string[];
    }): Promise<DataBatchEntity> {
        let packageEntity = await this.manager.getCustomRepository(PackageRepository).findOrFail({ identifier });

        let batch = await this.manager.getRepository(DataBatchEntity).findOneOrFail({
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
        streamIdentifier: StreamIdentifier;
        relations?: string[];
    }): Promise<DataBatchEntity[]> {
        const ALIAS = "batchesByPackageVersion";

        let packageEntity = await this.manager.getCustomRepository(PackageRepository).findOrFail({ identifier: streamIdentifier });

        const batches = await this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageEntity.id })
            .andWhere('"DataBatchEntity"."majorVersion" = :majorVersion')
            .andWhere('"DataBatchEntity"."schematitle" = :schemaTitle')
            .andWhere('"DataBatchEntity"."streamSlug" = :streamSlug')
            .addRelations(ALIAS, relations)
            .setParameter("majorVersion", streamIdentifier.majorVersion)   
            .setParameter("schemaTitle", streamIdentifier.schemaTitle)
            .setParameter("streamSlug", streamIdentifier.streamSlug)
            .orderBy({
                "DataBatchEntity.batch": "DESC"
            })
            .getMany();

        return batches;
    }

    async findBatchesWithLimitAndOffset(
        streamIdentifier: StreamIdentifier,
        offset: number,
        limit: number,
        relations?: string[]
    ): Promise<DataBatchEntity[]> {
        const ALIAS = "versionsByPackageId";


        let packageEntity = await this.manager.getCustomRepository(PackageRepository).findOrFail({ identifier: streamIdentifier });

        const batches = await this.manager
            .getRepository(DataBatchEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageEntity.id })
            .andWhere('"DataBatchEntity"."majorVersion" = :majorVersion')
            .andWhere('"DataBatchEntity"."schematitle" = :schemaTitle')
            .andWhere('"DataBatchEntity"."streamslug" = :streamSlug')
            .addRelations(ALIAS, relations)
            .setParameter("majorVersion", streamIdentifier.majorVersion)   
            .setParameter("schemaTitle", streamIdentifier.schemaTitle)
            .setParameter("streamSlug", streamIdentifier.streamSlug)
            .offset(offset)
            .limit(limit)
            .orderBy({
                "DataBatchEntity.batch": "DESC"
            })
            .getMany();

        return batches;
    }

    async deleteBatches(batches: DataBatchEntity[]): Promise<void> {
        if (batches.length == 0) return;

        for (const batch of batches) {
            const batchIdentifier: BatchIdentifier = {
                registryUrl: process.env.REGISTRY_URL as string,
                catalogSlug: batch.package.catalog.slug,
                packageSlug: batch.package.slug,
                majorVersion: batch.majorVersion,
                batch: batch.batch,
                schemaTitle: batch.schemaTitle,
                streamSlug: batch.streamSlug
            };
            try {
                await this.dataStorageService.deleteBatch(batch.package.id, batchIdentifier);
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
