import { EntityRepository, Repository } from "typeorm";

import { Image } from "../entity/Image";
import { ImageType } from "../storage/images/image-type";

@EntityRepository(Image)
export class ImageRepository extends Repository<Image> {
    public async findAllByEntityReferenceId(entityReferenceId: number): Promise<Image[]> {
        return await this.manager
            .getRepository(Image)
            .createQueryBuilder("findByEntityReferenceId")
            .where({ reference_entity_id: entityReferenceId })
            .getMany();
    }

    public async findOneEntityReferenceIdAndType(
        referenceEntityId: number,
        type: ImageType
    ): Promise<Image | undefined> {
        return await this.manager
            .getRepository(Image)
            .createQueryBuilder("findByEntityReferenceId")
            .where({ referenceEntityId, type })
            .limit(1)
            .getOne();
    }
}
