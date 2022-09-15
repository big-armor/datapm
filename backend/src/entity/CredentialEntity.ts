import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { RepositoryEntity } from "./RepositoryEntity";
import { UserEntity } from "./UserEntity";
@Entity({
    name: "credential"
})
@Unique(["repositoryId", "credentialIdentifier"])
export class CredentialEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id: number;

    @Column({ nullable: false, name: "encrypted_credentials" })
    encryptedCredentials: string;

    @ManyToOne(() => RepositoryEntity, { eager: true })
    @JoinColumn({ name: "repository_id" })
    repository: RepositoryEntity;

    @Column({ name: "repository_id" })
    repositoryId: number;

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;

    @Column({ nullable: false, name: "credential_identifier" })
    credentialIdentifier: string;
}
