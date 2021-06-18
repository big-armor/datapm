import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { EntityBaseModel } from "./EntityBaseModel";

@Entity({
    name: "platform_state"
})
@Unique(["id"])
@Unique(["key"])
export class PlatformStateEntity extends EntityBaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public key: string;

    @Column({ name: "serialized_state" })
    public serializedState: string;
}
