import { Entity, Column, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { UserCatalogPermissionEntity } from "./UserCatalogPermissionEntity";
import { UserStatus } from "../generated/graphql";
import { GroupUserEntity } from "./GroupUserEntity";
@Entity({
    name: "user"
})
@Unique(["emailAddress"])
@Unique(["sub"])
export class UserEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true, name: "last_login", type: "timestamptz" })
    lastLogin: Date | null;

    @Column({ name: "is_site_admin" })
    isAdmin: boolean;

    @Column({ length: 30, name: "first_name", type: "varchar", nullable: true })
    firstName?: string;

    @Column({ length: 150, name: "last_name", type: "varchar", nullable: true })
    lastName?: string;

    get displayName(): string {
        if (this.nameIsPublic) return this.name;
        else return this.username;
    }

    get name(): string {
        return `${this.firstName || ""} ${this.lastName || ""}`.trim();
    }

    @Column({ length: 254, type: "varchar", name: "emailAddress" })
    emailAddress: string;

    @Column({ nullable: true, length: 255, type: "varchar" })
    sub: string | null;

    @Column({ length: 39, type: "varchar" })
    username: string;

    @OneToMany(() => UserCatalogPermissionEntity, (userCatalogPermission) => userCatalogPermission.user, {
        cascade: true
    })
    catalogPermissions: UserCatalogPermissionEntity[];

    @OneToMany(() => GroupUserEntity, (groupUser) => groupUser.user, {
        cascade: true
    })
    groups: GroupUserEntity[];

    @Column({ nullable: true })
    twitterHandle?: string;

    @Column({ nullable: true })
    website?: string;

    @Column({ nullable: true })
    gitHubHandle?: string;

    @Column({ nullable: true })
    location?: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: false, default: false })
    nameIsPublic: boolean;

    @Column({ nullable: false, default: false })
    locationIsPublic: boolean;

    @Column({ nullable: false, default: false })
    twitterHandleIsPublic: boolean;

    @Column({ nullable: false, default: false })
    gitHubHandleIsPublic: boolean;

    @Column({ nullable: false, default: false })
    emailAddressIsPublic: boolean;

    @Column({ nullable: false, default: false })
    websiteIsPublic: boolean;

    @Column({ nullable: false, name: "password_hash" })
    passwordHash: string;

    @Column({ nullable: false, name: "password_salt" })
    passwordSalt: string;

    /** The secret used for verifying email addresses */
    @Column({ nullable: true, name: "verify_email_token" })
    verifyEmailToken?: string;

    /** The date on which the verifyEmailToken was created */
    @Column({ nullable: true, name: "verify_email_token_date" })
    verifyEmailTokenDate: Date;

    /** Whether the user has completed email verification. */
    @Column({ nullable: false, default: false, name: "email_verified" })
    emailVerified: boolean;

    /** Unique token to allow for password recovery. */
    @Column({ nullable: true, name: "password_recovery_token", type: "varchar" })
    passwordRecoveryToken: string | null;

    /** The date on which the passwordRecoveryToken was created */
    @Column({ nullable: true, name: "password_recovery_token_date" })
    passwordRecoveryTokenDate: Date;

    @Column("enum", { array: false, name: "status", enum: UserStatus })
    status: UserStatus;

    /** Whether the user has enabled the dark mode ui theme. */
    @Column({ nullable: false, default: false, name: "ui_dark_mode_enabled" })
    uiDarkModeEnabled: boolean;
}
