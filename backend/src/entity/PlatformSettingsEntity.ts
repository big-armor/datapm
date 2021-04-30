import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";

@Entity({
    name: "platform_settings"
})
@Unique(["id"])
@Unique(["key"])
export class PlatformSettingsEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public key: string;

    @Column({ name: "serialized_settings" })
    public serializedSettings: string;

    @Column({ name: "is_public" })
    public isPublic: boolean;
}
