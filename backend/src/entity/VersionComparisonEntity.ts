import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, OneToMany } from "typeorm";

import { EntityBaseModel } from "./EntityBaseModel";
import { VersionDifferenceEntity } from "./VersionDifferenceEntity";
import { VersionEntity } from "./VersionEntity";

@Entity({ name: "version_comparison" })
@Unique(["id"])
@Unique(["newVersionId", "oldVersionId"])
export class VersionComparisonEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "new_version_id" })
    public newVersionId: number;

    @Column({ name: "old_version_id", nullable: false })
    public oldVersionId: number;

    @ManyToOne(() => VersionEntity)
    @JoinColumn({ name: "new_version_id" })
    public newVersion: VersionEntity;

    @ManyToOne(() => VersionEntity)
    @JoinColumn({ name: "old_version_id" })
    public oldVersion: VersionEntity;

    @OneToMany(() => VersionDifferenceEntity, (diffEntity) => diffEntity.versionComparison)
    public differences: VersionDifferenceEntity[];
}
