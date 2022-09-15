import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { CredentialEntity } from "./CredentialEntity";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageEntity } from "./PackageEntity";
import { UserEntity } from "./UserEntity";
@Entity({
    name: "repository"
})
@Unique(["packageId", "connectorType", "repositoryIdentifier"])
export class RepositoryEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id: number;

    @ManyToOne(() => PackageEntity, { eager: true })
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @Column({ name: "package_id" })
    packageId: number;

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @OneToMany(() => CredentialEntity, (credential) => credential.repository, {
        cascade: true
    })
    credentials: CredentialEntity[];

    @Column({ name: "creator_id" })
    creatorId: number;

    @Column({ nullable: false, name: "connector_type" })
    connectorType: string;

    @Column({ nullable: false, name: "repository_identifier" })
    repositoryIdentifier: string;

    @Column({ nullable: false, name: "connection_configuration" })
    connectionConfiguration: string;
}
