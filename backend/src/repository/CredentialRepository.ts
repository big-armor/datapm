import { EntityRepository, Repository } from "typeorm";
import { CredentialEntity } from "../entity/CredentialEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";
import { PackageIdentifierInput, User } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";

@EntityRepository(CredentialEntity)
export class CredentialRepository extends Repository<CredentialEntity> {

    async packageCredentials({
        packageEntity,
        limit,
        offset,
        relations = []
    }: {
        packageEntity: PackageEntity;
        limit: number,
        offset: number
        relations?: string[];
    }): Promise<[CredentialEntity[], number]> {

        const response = await this.createQueryBuilder()
            .where(
                `("CredentialEntity".package_id = :packageId)`
            )
            .setParameter("packageId", packageEntity.id)
            .offset(offset)
            .limit(limit)
            .addRelations("CredentialEntity", relations)
            .getManyAndCount();

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


    public async createCredential(packageEntity: PackageEntity, connectorType: string, repositoryIdentifier: string, credentialIdentifier: string, encryptedCredential: string, creator: UserEntity): Promise<CredentialEntity> {

    
        return await this.manager.transaction( async(entityManager) => {


            const credentialEntity = entityManager.create(CredentialEntity);
            credentialEntity.credentialIdentifier = credentialIdentifier;
            credentialEntity.encryptedCredentials = encryptedCredential;
            credentialEntity.packageId = packageEntity.id;
            credentialEntity.connectorType = connectorType;
            credentialEntity.repositoryIdentifier = repositoryIdentifier;
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