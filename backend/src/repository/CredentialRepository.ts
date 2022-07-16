import { EntityRepository, Repository } from "typeorm";
import { CredentialEntity } from "../entity/CredentialEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { RepositoryEntity } from "../entity/RepositoryEntity";
import { UserEntity } from "../entity/UserEntity";
import { PackageIdentifierInput, User } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";

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
            .where(
                `("CredentialEntity".repository_id = :repositoryId)`
            )
            .setParameter("repositoryId", repositoryEntity.id)
            .addRelations("CredentialEntity", relations)
            .getMany();

        return response;
    }


    public async deleteCredential(identifier: PackageIdentifierInput, connectorType: string, repositoryIdentifier: string,  credentialIdentifier: string): Promise<void> {

        const credential = await this.findCredential(identifier, connectorType, repositoryIdentifier, credentialIdentifier);

        if(credential == null)
            throw new Error("CREDENTIALS_NOT_FOUND");


        await this.manager.nestedTransaction(async (transaction) => {
            await this.manager.getRepository(CredentialEntity).delete(credential.id);
        });


    }


    public async createCredential(repositoryEntity: RepositoryEntity, connectorType: string, repositoryIdentifier: string, credentialIdentifier: string, encryptedCredential: string, creator: UserEntity): Promise<CredentialEntity> {

    
        return await this.manager.transaction( async(entityManager) => {


            const credentialEntity = entityManager.create(CredentialEntity);
            credentialEntity.credentialIdentifier = credentialIdentifier;
            credentialEntity.encryptedCredentials = encryptedCredential;
            credentialEntity.repositoryId = repositoryEntity.id;
            credentialEntity.creatorId = creator.id;

            entityManager.save([credentialEntity]);

            return credentialEntity;
        })




    }

    public async findCredential(identifier: PackageIdentifierInput,connectorType: string, repositoryIdentifier: string,  credentialIdentifier: string): Promise<CredentialEntity | undefined> {

        const packageEntity = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({identifier});

        const credential = await this.createQueryBuilder()
                .where('"CredentialEntity"."package_id" = :packageId AND "CredentialEntity"."repository_identifier" = :repositoryIdentifier AND "CredentialEntity"."connector_type" = :connectorType AND "CredentialEntity"."credential_identifier" = :credentialIdentifier')
                .setParameter("packageId", packageEntity.id)
                .setParameter("repositoryIdentifier", repositoryIdentifier)
                .setParameter("connectorType", connectorType)
                .setParameter("credentialIdentifier", credentialIdentifier)
                .getOne();

        return credential;
    }



}