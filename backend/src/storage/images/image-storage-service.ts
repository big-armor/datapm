import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { FileUpload } from "graphql-upload";
import { v4 as uuid } from "uuid";
import { AuthenticatedContext } from "../../context";
import { Image } from "../../entity/Image";
import { ImageType } from "./image-type";
import { ImageRepository } from "../../repository/ImageRepository";
import { ImageProcessorProvider } from "./image-processor-provider";
import { Connection } from "typeorm";
import { ImageEntityAndStream } from "./image-entity-and-stream";

export class ImageStorageService {
    public static readonly INSTANCE = new ImageStorageService();

    private static readonly NAMESPACE = "media";
    private readonly storageService: DPMStorage = StorageProvider.getStorage();

    public async saveImage(
        itemId: number,
        image: FileUpload,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image> {
        const existingImage = await this.findImage(itemId, imageType, context);
        if (existingImage) {
            return this.updateImage(existingImage, image, imageType, context);
        }

        return this.createImage(itemId, image, imageType, context);
    }

    public async createImage(
        itemId: number,
        image: FileUpload,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image> {
        const fileName = uuid();
        const fileStream = image.createReadStream();
        const formatter = ImageProcessorProvider.getImageProcessor(imageType, image.mimetype).getFormatter();
        await this.storageService.writeItem(ImageStorageService.NAMESPACE, fileName, fileStream, formatter);
        const imageEntity = this.buildImageEntity(fileName, itemId, context.me.id, imageType, image.mimetype);
        return this.getRepository(context).save(imageEntity);
    }

    public async updateImage(
        imageEntity: Image,
        image: FileUpload,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image> {
        const fileStream = image.createReadStream();
        const formatter = ImageProcessorProvider.getImageProcessor(imageType, image.mimetype).getFormatter();
        await this.storageService.writeItem(ImageStorageService.NAMESPACE, imageEntity.id, fileStream, formatter);
        return this.getRepository(context).save(imageEntity);
    }

    public async readImage(imageId: string, connection: Connection): Promise<ImageEntityAndStream> {
        return new Promise(async (resolve, reject) => {
            const repository = connection.getCustomRepository(ImageRepository);
            const entity = await repository.findOne(imageId);
            if (entity == null) {
                reject("Could not find image");
                return;
            }

            const stream = await this.storageService.getItem(ImageStorageService.NAMESPACE, imageId);
            resolve({ entity, stream });
        });
    }

    public async findImage(
        itemId: number,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image | undefined> {
        const repository = this.getRepository(context);
        return repository.findOneEntityReferenceIdAndType(itemId, imageType);
    }

    private buildImageEntity(
        imageId: string,
        itemId: number,
        userId: number,
        imageType: ImageType,
        mimeType: string
    ): Image {
        const imageEntity = new Image();
        imageEntity.id = imageId;
        imageEntity.referenceEntityId = itemId;
        imageEntity.userId = userId;
        imageEntity.type = imageType;
        imageEntity.mimeType = mimeType;
        return imageEntity;
    }

    private getRepository(context: AuthenticatedContext): ImageRepository {
        return context.connection.getCustomRepository(ImageRepository);
    }
}
