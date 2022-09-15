import { Repository as RepositoryGraphQL, PackageIdentifierInput } from "datapm-client-lib";
import { DPMConfiguration } from "datapm-lib";
import { Connection, EntityManager, EntityRepository, Repository } from "typeorm";
import { Context } from "../context";
import { CredentialEntity } from "../entity/CredentialEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { RepositoryEntity } from "../entity/RepositoryEntity";
import { UserEntity } from "../entity/UserEntity";
import { getPackageFromCacheOrDbByIdOrFail, packageEntityToGraphqlObject } from "../resolvers/PackageResolver";
import { CredentialRepository } from "./CredentialRepository";
import { PackageRepository } from "./PackageRepository";

export const repositoryEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager | Connection,
    repositoryEntity: RepositoryEntity
): Promise<RepositoryGraphQL> => {
    const packageEntity = await getPackageFromCacheOrDbByIdOrFail(
        context,
        connection,
        repositoryEntity.packageId,
        true
    );

    const credentials = await context.connection.manager
        .getCustomRepository(CredentialRepository)
        .repositoryCredentials({ repositoryEntity });

    return {
        connectorType: repositoryEntity.connectorType,
        createdAt: repositoryEntity.createdAt,
        updatedAt: repositoryEntity.updatedAt,
        repositoryIdentifier: repositoryEntity.repositoryIdentifier,
        credentials,
        creator: repositoryEntity.creator,
        package: await packageEntityToGraphqlObject(context, connection, packageEntity)
    };
};

@EntityRepository(RepositoryEntity)
export class RepositoryRepository extends Repository<RepositoryEntity> {
    async packageRepositories({
        packageEntity,
        limit,
        offset,
        relations = []
    }: {
        packageEntity: PackageEntity;
        limit: number;
        offset: number;
        relations?: string[];
    }): Promise<[RepositoryEntity[], number]> {
        const response = await this.createQueryBuilder()
            .where(`("RepositoryEntity".package_id = :packageId)`)
            .setParameter("packageId", packageEntity.id)
            .offset(offset)
            .limit(limit)
            .addRelations("RepositoryEntity", relations)
            .getManyAndCount();

        return response;
    }

    public async createOrUpdateRepository(
        packageEntity: PackageEntity,
        connectorType: string,
        repositoryIdentifier: string,
        connectionConfiguration: DPMConfiguration,
        creator: UserEntity
    ): Promise<RepositoryEntity> {
        return await this.manager.transaction(async (entityManager) => {
            const existingRepository = await entityManager.findOne(RepositoryEntity, {
                where: {
                    repositoryIdentifier,
                    connectorType,
                    packageId: packageEntity.id
                }
            });

            if (existingRepository != null) {
                existingRepository.connectionConfiguration = JSON.stringify(connectionConfiguration);
                await entityManager.save(existingRepository);
                return existingRepository;
            } else {
                const repositoryEntity = entityManager.create(RepositoryEntity);
                repositoryEntity.packageId = packageEntity.id;
                repositoryEntity.connectorType = connectorType;
                repositoryEntity.repositoryIdentifier = repositoryIdentifier;
                repositoryEntity.creatorId = creator.id;
                repositoryEntity.connectionConfiguration = JSON.stringify(connectionConfiguration);

                await entityManager.save(repositoryEntity);

                return repositoryEntity;
            }
        });
    }

    public async deleteRepository(
        identifier: PackageIdentifierInput,
        connectorType: string,
        repositoryIdentifier: string
    ): Promise<void> {
        await this.manager.nestedTransaction(async (transaction) => {
            const repository = await transaction
                .getCustomRepository(RepositoryRepository)
                .findRepository(identifier, connectorType, repositoryIdentifier);

            if (repository == null) throw new Error("REPOSITORY_NOT_FOUND");

            await transaction.getRepository(RepositoryEntity).remove(repository);
        });
    }

    public async findRepository(
        identifier: PackageIdentifierInput,
        connectorType: string,
        repositoryIdentifier: string,
        relations: string[] = []
    ): Promise<RepositoryEntity | undefined> {
        const packageEntity = await this.manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier });

        const repository = await this.createQueryBuilder()
            .where(
                '"RepositoryEntity"."package_id" = :packageId AND "RepositoryEntity"."repository_identifier" = :repositoryIdentifier AND "RepositoryEntity"."connector_type" = :connectorType'
            )
            .setParameter("packageId", packageEntity.id)
            .setParameter("repositoryIdentifier", repositoryIdentifier)
            .setParameter("connectorType", connectorType)
            .addRelations("RepositoryEntity", relations)
            .getOne();

        return repository;
    }

    public async findRepositoriesByConnectorType(
        identifier: PackageIdentifierInput,
        connectorType: string
    ): Promise<RepositoryEntity[]> {
        const packageEntity = await this.manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier });

        const repositories = await this.createQueryBuilder()
            .where(
                '"RepositoryEntity"."package_id" = :packageId AND "RepositoryEntity"."connector_type" = :connectorType'
            )
            .setParameter("packageId", packageEntity.id)
            .setParameter("connectorType", connectorType)
            .getMany();

        return repositories;
    }
}
