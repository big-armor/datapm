import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

import { EntityBaseModel } from "./EntityBaseModel";
import { CatalogEntity } from "./CatalogEntity";
import { VersionEntity } from "./VersionEntity";
import { UserEntity } from "./UserEntity";

@Entity({
    name: "package"
})
@Unique(["slug", "catalogId"])
export class PackageEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
        name: "slug",
        length: 256,
        type: "varchar"
    })
    slug: string;

    @Column({
        nullable: true,
        name: "displayName",
        length: 256,
        type: "varchar"
    })
    displayName: string;

    @Column({
        name: "description",
        nullable: true,
        type: "text"
    })
    description: string | null;

    @ManyToOne(() => CatalogEntity, { eager: true })
    @JoinColumn({ name: "catalog_id" })
    catalog: CatalogEntity;

    @Column({ name: "catalog_id" })
    catalogId: number;

    @Column({ nullable: false, default: false })
    isPublic: boolean;

    @OneToMany(() => VersionEntity, (version) => version.package, {})
    @JoinColumn({ name: "catalog_id" })
    versions: VersionEntity[];

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "creator_id" })
    creator: UserEntity;

    @Column({ name: "creator_id", nullable: false })
    public creatorId: number;

    @Column({ name: "fetch_count", nullable: false })
    public fetchCount: number;

    @Column({ name: "view_count", nullable: false })
    public viewCount: number;

    @Column({ name: "last_update_job_date", nullable: false })
    public lastUpdateJobDate: Date;
}
