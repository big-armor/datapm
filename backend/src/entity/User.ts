import { Entity, Column, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { BaseModel } from "./BaseModel";
import { UserCatalogPermission } from "./UserCatalogPermission";

@Entity({
    name: "user"
})
@Unique(["emailAddress"])
@Unique(["sub"])
export class User extends BaseModel {
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

    get name(): string {
        return `${this.firstName || ""} ${this.lastName || ""}`.trim();
    }

    @Column({ length: 254, type: "varchar" })
    emailAddress: string;

    @Column({ name: "is_active" })
    isActive: boolean;

    @Column({ nullable: true, length: 255, type: "varchar" })
    sub: string | null;

    @Column({ length: 39, type: "varchar" })
    username: string;

    @OneToMany(() => UserCatalogPermission, (userCatalogPermission) => userCatalogPermission.user, { cascade: true })
    catalogPermissions: UserCatalogPermission[];

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
}
