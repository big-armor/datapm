import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";
import { PackageEntity } from "./PackageEntity";
import { UserEntity } from "./UserEntity";
import { UpdateMethod } from "datapm-lib";

@Entity({
    name: "batch"
})
@Unique(["packageId", "majorVersion", "schemaTitle", "streamSlug", "batch"])
export class DataBatchEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => PackageEntity, { eager: true })
    @JoinColumn({ name: "package_id" })
    package: PackageEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "author_id" })
    author: UserEntity;

    @Column({ name: "package_id" })
    packageId: number;

    @Column({ name: "major_version" })
    majorVersion: number;

    @Column({ name: "author_id" })
    authorId: number;

    @Column({ name: "schematitle" })
    schemaTitle: string;

    @Column({ name: "sourcetype" })
    sourceType: string;

    @Column({ name: "sourceslug" })
    sourceSlug: string;

    @Column({ name: "streamsetslug" })
    streamSetSlug: string;

    @Column({ name: "streamslug" })
    streamSlug: string;

    @Column()
    batch: number;

    @Column("enum", { name: "updatemethod", enum: UpdateMethod })
    updateMethod: UpdateMethod;

    @Column({
        name: "lastoffset",
        transformer: {
            to: (value) => value,
            from: (value) => parseInt(value)
        }
    })
    lastOffset: number;

    @Column()
    default: boolean;
}
