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


    public async deleteCredential(identifier: PackageIdentifierInput, sourceSlug: string, sourceType: string, credentialIdentifier: string): Promise<void> {

        const packageEntity = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({identifier});

        const credentials = await this.createQueryBuilder()
                .where('"CredentialEntity"."package_id" = :packageId AND "CredentialEntity"."sourceSlug" = :sourceSlug AND "CredentialEntity"."sourceType" = :sourceType AND "CredentialEntity"."credentialIdentifier" = :credentialIdentifier')
                .setParameter("packageId", packageEntity.id)
                .setParameter("sourceSlug", sourceSlug)
                .setParameter("sourceType", sourceType)
                .setParameter("credentialIdentifier", credentialIdentifier)
                .getOne();

        if(credentials == null)
            throw new Error("CREDENTIALS_NOT_FOUND");

        await this.delete({ id: credentials.id });

    }


    public async createCredential(packageEntity: PackageEntity, sourceSlug: string, sourceType: string, credentialIdentifier: string, encryptedCredential: string, creator: UserEntity): Promise<CredentialEntity> {

    
        return await this.manager.transaction( async(entityManager) => {


            const credentialEntity = entityManager.create(CredentialEntity);
            credentialEntity.credentialIdentifier = credentialIdentifier;
            credentialEntity.encryptedCredentials = encryptedCredential;
            credentialEntity.packageId = packageEntity.id;
            credentialEntity.sourceSlug = sourceSlug;
            credentialEntity.sourceType = sourceType;
            credentialEntity.creatorId = creator.id;

            entityManager.save([credentialEntity]);

            return credentialEntity;
        })




    }

}