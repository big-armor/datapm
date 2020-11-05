import { Entity, Column, PrimaryColumn } from "typeorm";
import { BaseModel } from "./BaseModel";

@Entity("image")
export class Image extends BaseModel {
    @PrimaryColumn()
    public id: string;

    @Column({ name: "reference_entity_id" })
    public referenceEntityId: number;

    @Column({ name: "user_id" })
    public userId: number;

    @Column({ name: "image_type" })
    public type: string;

    @Column({ name: "mime_type" })
    public mimeType: string;
}
