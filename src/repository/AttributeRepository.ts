import { EntityRepository, EntityManager } from "typeorm";
import { DataTypeIdentifier, CreateAttributeInput, AttributeIdentifierInput } from "../generated/graphql";
import { DataTypeRepository } from "./DataTypeRepository";
import { Attribute } from "../entity/Attribute";
import { ValueTypeStats } from "../entity/ValueTypeStats";

@EntityRepository()
export class AttributeRepository {

    constructor(private manager: EntityManager) {}


    async save(identifier: DataTypeIdentifier, value: CreateAttributeInput | CreateAttributeInput[]) {

        return await this.manager.nestedTransaction(async (transaction) => {

            const attributes = Array.isArray(value) ? value as CreateAttributeInput[] : [value as CreateAttributeInput];

            const dataType = await transaction.getCustomRepository(DataTypeRepository)
                .findOneOrFail({identifier});


            return Promise.all( attributes.map(async (attributeInput) => {
              let attribute = transaction
                .getRepository(Attribute)
                .create({
                  dataTypeId: dataType.id,
                  displayName: attributeInput.displayName,
                  slug: attributeInput.slug,
                  valueTypes: attributeInput.valueTypes,
                  valueTypeStats: attributeInput.valueTypeStats,
                  isList: attributeInput.isList,
                  description: attributeInput.description || undefined,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });

              return await transaction.save(attribute);

            }));


        });


    
  }


  async findOneOrFail({
    identifier,
    relations = []
  }: {
    identifier: AttributeIdentifierInput;
    relations?: string[]
  }): Promise<Attribute> {

    const dataType = await this.manager.getCustomRepository(DataTypeRepository).findOneOrFail({identifier})

    const ALIAS = "attribute";
    const attribute = await this.manager
      .getRepository(Attribute)
      .findOne({where:{ dataTypeId: dataType.id, slug: identifier.attributeSlug}, relations: relations });
  
    if (!attribute) {
      throw new Error(`Attribute ${identifier.attributeSlug} not found`);
    }
  
    return attribute;
  }

  async findAttributes({
    identifier,
    relations = []
  }: {
    identifier: AttributeIdentifierInput;
    relations?: string[]
  }): Promise<Attribute[]> {

    const dataType = await this.manager.getCustomRepository(DataTypeRepository).findOneOrFail({identifier})

    const ALIAS = "attribute";
    const attributes = await this.manager
      .getRepository(Attribute)
      .find({where:{ dataTypeId: dataType.id}, relations: relations });
  
    return attributes;
  }


}
