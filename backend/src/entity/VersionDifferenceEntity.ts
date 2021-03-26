import { DifferenceType } from "datapm-lib";
import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

import { VersionComparisonEntity } from "./VersionComparisonEntity";

@Entity({ name: "version_difference" })
@Unique(["id"])
export class VersionDifferenceEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: "version_comparison_id" })
    public versionComparisonId: number;

    @Column({ name: "type" })
    public type: string;

    @Column()
    public pointer: string;

    @ManyToOne(() => VersionComparisonEntity)
    @JoinColumn({ name: "version_comparison_id" })
    public versionComparison: VersionComparisonEntity;
}
