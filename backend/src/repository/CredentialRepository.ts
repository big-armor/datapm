import { EntityRepository, Repository } from "typeorm";
import { CredentialEntity } from "../entity/CredentialEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { RepositoryEntity } from "../entity/RepositoryEntity";
import { UserEntity } from "../entity/UserEntity";
import { PackageIdentifierInput, User } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";
import { RepositoryRepository } from "./RepositoryRepository";

@EntityRepository(CredentialEntity)
export class CredentialRepository extends Repository<CredentialEntity> {
    async repositoryCredentials({
        repositoryEntity,
        relations = []
    }: {
        repositoryEntity: RepositoryEntity;
        relations?: string[];
    }): Promise<CredentialEntity[]> {
        const response = await this.createQueryBuilder()
            .where(`("CredentialEntity".repository_id = :repositoryId)`)
            .setParameter("repositoryId", repositoryEntity.id)
            .addRelations("CredentialEntity", relations)
            .getMany();

        return response;
    }

    public async deleteCredential(
        identifier: PackageIdentifierInput,
        connectorType: string,
        repositoryIdentifier: string,
        credentialIdentifier: string
    ): Promise<void> {
        const credential = await this.findCredential(
            identifier,
            connectorType,
            repositoryIdentifier,
            credentialIdentifier
        );

        if (credential == null) throw new Error("CREDENTIALS_NOT_FOUND");

        await this.manager.nestedTransaction(async (transaction) => {
            await this.manager.getRepository(CredentialEntity).delete(credential.id);
        });
    }

    public async createOrUpdateCredential(
        repositoryEntity: RepositoryEntity,
        connectorType: string,
        repositoryIdentifier: string,
        credentialIdentifier: string,
        encryptedCredential: string,
        creator: UserEntity
    ): Promise<CredentialEntity> {
        return await this.manager.transaction(async (entityManager) => {
            const credential = await entityManager.getCustomRepository(CredentialRepository).findOne(undefined, {
                where: {
                    repositoryId: repositoryEntity.id,
                    credentialIdentifier: credentialIdentifier
                }
            });

            if (credential != null) {
                credential.encryptedCredentials = encryptedCredential;
                await entityManager.save(credential);
                return credential;
            } else {
                const credentialEntity = entityManager.create(CredentialEntity);
                credentialEntity.credentialIdentifier = credentialIdentifier;
                credentialEntity.encryptedCredentials = encryptedCredential;
                credentialEntity.repositoryId = repositoryEntity.id;
                credentialEntity.creatorId = creator.id;

                entityManager.save([credentialEntity]);

                return credentialEntity;
            }
        });
    }

    public async findCredential(
        identifier: PackageIdentifierInput,
        connectorType: string,
        repositoryIdentifier: string,
        credentialIdentifier: string
    ): Promise<CredentialEntity | undefined> {
        const repositoryEntity = await this.manager
            .getCustomRepository(RepositoryRepository)
            .findRepository(identifier, connectorType, repositoryIdentifier);

        if (repositoryEntity == null) throw new Error("REPOSITORY_NOT_FOUND");

        const credential = await this.createQueryBuilder()
            .where(
                '"CredentialEntity"."repository_id" = :repositoryId AND "CredentialEntity"."credential_identifier" = :credentialIdentifier'
            )
            .setParameter("repositoryId", repositoryEntity.id)
            .setParameter("credentialIdentifier", credentialIdentifier)
            .getOne();

        return credential;
    }
}
