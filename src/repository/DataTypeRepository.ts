import { EntityRepository, EntityManager } from "typeorm";
import { Version } from "../entity/Version";
import { VersionIdentifier, PackageIdentifier, VersionIdentifierInput, CreateVersionInput, PackageIdentifierInput, CreateDataTypeInput, DataTypeIdentifier, DataTypeIdentifierInput, VersionIdentifierResolvers, Protocol, ValueType } from "../generated/graphql";
import { Package } from "../entity/Package";
import { PackageRepository } from "./PackageRepository";
import { DataType } from "../entity/DataType";
import { VersionRepository } from "./VersionRepository";
import { AttributeRepository } from "./AttributeRepository";
import { dataTypeIdentifier } from "../util/IdentifierUtil";
import { DataTypeStatisticsRepository } from "./DataTypeStatisticsRepository";
import { Transfer } from "../entity/Transfer";
import { Format } from "../entity/Format";
import { ValueTypeStats } from "../entity/ValueTypeStats";

@EntityRepository()
export class DataTypeRepository {
  
  constructor(private manager: EntityManager) {}


  async save(identifier: VersionIdentifierInput, value: CreateDataTypeInput | CreateDataTypeInput[]) {

    console.log("Saving dataType");

    return await this.manager.nestedTransaction(async (transaction) => {
      const version = await transaction.getCustomRepository(VersionRepository)
        .findOneOrFail({identifier});

        const dataTypeInputs: CreateDataTypeInput[] = Array.isArray(value) ? value : [value];

        const dataTypes: DataType[] = dataTypeInputs.map( (dataTypeInput) => {
          return transaction
          .getRepository(DataType)
          .create({
            versionId: version.id,
            displayName: dataTypeInput.displayName,
            slug: dataTypeInput.slug,
            description: dataTypeInput.description,
            attributes: dataTypeInput.attributes,
            statistics: dataTypeInput.statistics,
            transfer: dataTypeInput.transfer,
            format: dataTypeInput.format
          });
        });

          
        await transaction.save(dataTypes);
  
        return;

        });

       
  }


  async findOneOrFail({
    identifier,
    relations = []
  }: {
    identifier: DataTypeIdentifierInput;
    relations?: string[];
  }): Promise<DataType> {

    console.log(`DataTypeRespository.findOneOrFail start - ${JSON.stringify(identifier)}`);

    const version = await this.manager.getCustomRepository(VersionRepository).findOneOrFail({identifier})
    console.log(`DataTypeRespository.findOneOrFail found version - ${JSON.stringify(version)}`)

    const dataType = await this.manager
      .getRepository(DataType)
      .findOne({where: { versionId: version.id, slug: identifier.dataTypeSlug}, relations: relations});
  
      console.log(`DataTypeRespository.findOneOrFail found data type ${JSON.stringify(dataType)}`)

    if (!dataType) {
      throw new Error(`DataType ${identifier.dataTypeSlug} not found`);
    }
  
    return dataType;
  }

  async findDataTypes({
    identifier,
    relations
  }: {
    identifier: VersionIdentifierInput;
    relations: string[]
  }): Promise<DataType[]> {

    const version = await this.manager.getCustomRepository(VersionRepository).findOneOrFail({identifier})

    const dataTypes = await this.manager
      .getRepository(DataType)
      .find({where: { versionId: version.id}, relations: relations});

  
    return dataTypes;
  }



}
