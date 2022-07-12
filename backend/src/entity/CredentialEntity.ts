import { Entity, Column, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageEntity } from "./PackageEntity";
import { UserEntity } from "./UserEntity";
@Entity({
    name: "credential"
})
@Unique(["packageId","sourceSlug","sourceType","credentialIdentifier"])
export class CredentialEntity extends EntityBaseModel {

    @PrimaryGeneratedColumn({name: "id", type: "int"})
    id: number;

    @Column({ nullable: false, name: "encrypted_credentials" })
    encryptedCredentials: string;

    @ManyToOne(() => PackageEntity, { eager: true })
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @Column({ name: "package_id" })
    packageId: number;

    @ManyToOne(() => UserEntity, { eager: true })
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id" })
    creatorId: number;

    @Column({ nullable: false, name: "credential_identifier" })
    credentialIdentifier: string;

    @Column({ nullable: false, name: "source_type" })
    sourceType: string;

    @Column({ nullable: false, name: "source_slug" })
    sourceSlug: string;

}
