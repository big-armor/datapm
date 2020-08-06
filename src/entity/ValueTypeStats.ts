import {
    Entity,
    Column,
    JoinColumn,
    PrimaryGeneratedColumn,
    Unique,
    OneToOne,
    OneToMany,
    ManyToOne,
  } from "typeorm";
  
import { BaseModel } from "./BaseModel";
import { Attribute } from "./Attribute";
import { ValueType } from "../generated/graphql";
import { StringOption } from "./StringOption";
  
@Entity({
name: "valueTypeStats",
})
@Unique(["attributeId","valueType"])
export class ValueTypeStats extends BaseModel {

    @PrimaryGeneratedColumn()
    id: number;

    @Column('enum', { name: 'value_type', enum: ValueType})
    valueType: ValueType;

    @Column({name: "recordCount", type: "bigint"})
    recordCount: number;

    @OneToMany(() => StringOption, (stringOption) => stringOption.valueTypeStat, { nullable: true, cascade: true })
    options: StringOption[] | null;

    @Column({type:"bigint", nullable: true})
    stringMaxLength: number | null;

    @Column({type:"bigint", nullable: true})
    stringMinLength: number | null;

    @Column({type:"numeric", nullable: true})
    numberMaxValue: number | null;

    @Column({type:"numeric", nullable: true})
    numberMinValue: number | null;

    @Column({nullable: true, type: "timestamp with time zone"})
    dateMaxValue: Date | null;

    @Column({nullable: true, type: "timestamp with time zone"})
    dateMinValue: Date | null;

    @ManyToOne(() => Attribute)
    @JoinColumn({ name: "attribute_id" })
    attribute: Attribute;

    @Column({ name: "attribute_id" })
    attributeId: number;

}
  