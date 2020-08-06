import {
    Entity,
    Column,
    JoinColumn,
    PrimaryGeneratedColumn,
    Unique,
    OneToOne,
    ManyToOne,
  } from "typeorm";
  
import { BaseModel } from "./BaseModel";
import { ValueTypeStats } from "./ValueTypeStats";

@Entity({
name: "stringOption",
})
@Unique(["valueTypeStatId","option"])
export class StringOption extends BaseModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable: false, name: "option", type: "varchar"})
    option: string;

    @Column({name: "count", type:"bigint"})
    count: number | null;

    @ManyToOne(() => ValueTypeStats)
    @JoinColumn({ name: "valueTypeStat_id" })
    valueTypeStat: ValueTypeStats;

    @Column({ name: "valueTypeStat_id" })
    valueTypeStatId: number;

}
  