import { EntityRepository, EntityManager } from "typeorm";
import { DataTypeRepository } from "./DataTypeRepository";
import { DataTypeIdentifier, UpdateDataStatisticsInput } from "../generated/graphql";
import { DataTypeStatistics as DataTypeStatistic, DataTypeStatistics } from "../entity/DataTypeStatistics";

@EntityRepository()
export class DataTypeStatisticsRepository {
  
  constructor(private manager: EntityManager) {}


  async save(identifier: DataTypeIdentifier, value: UpdateDataStatisticsInput) {

    return await this.manager.nestedTransaction(async (transaction) => {
      const dataType = await transaction.getCustomRepository(DataTypeRepository)
        .findOneOrFail({identifier});


        let statistic = transaction
            .getRepository(DataTypeStatistic)
            .create(<DataTypeStatistics>{
              dataTypeId: dataType.id,
              recordCount: value.recordCount,
              recordCountApproximate: value.recordCountApproximate,
              byteCount: value.byteCount,
              byteCountApproximate: value.byteCountApproximate,
              createdAt: new Date(),
              updatedAt: new Date()
            });

        
        statistic = await transaction.save(statistic);


        return await transaction.getRepository(DataTypeStatistic).findOneOrFail({id: statistic.id });

    });

    
  }




}
