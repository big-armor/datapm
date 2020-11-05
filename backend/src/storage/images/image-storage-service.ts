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
import * as stream from "stream";
import { Readable, Stream } from "stream";
import { User } from "../../entity/User";
import { UserRepository } from "../../repository/UserRepository";
import { exception } from "console";
import { read } from "fs";
import { ValidUsernameDirective } from "../../directive/ValidUsernameDirective";
import { validateUsername } from "../../directive/ValidUsernameDirective";

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
        const existingImage = await this.findImage(itemId, imageType, context.connection);
        if (existingImage) {
            return this.updateImage(existingImage, image, imageType, context);
        }

        return this.createImage(itemId, image, imageType, context);
    }

    public async saveImageFromBase64(
        itemId: number,
        base64: string,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image> {
        const imageStream = ImageStorageService.convertBase64ToStream(base64);
        const existingImage = await this.findImage(itemId, imageType, context.connection);
        if (existingImage) {
            return this.updateImageFromStream(existingImage, imageStream, imageType, "image/jpeg", context);
        }

        return this.createImageFromStream(itemId, imageStream, imageType, "image/jpeg", context);
    }

    public async saveImageFromStream(
        itemId: number,
        imageStream: Stream,
        imageType: ImageType,
        mimeType: string,
        context: AuthenticatedContext
    ): Promise<Image> {
        const existingImage = await this.findImage(itemId, imageType, context.connection);
        if (existingImage) {
            return this.updateImageFromStream(existingImage, imageStream, imageType, mimeType, context);
        }

        return this.createImageFromStream(itemId, imageStream, imageType, mimeType, context);
    }

    public async createImage(
        itemId: number,
        image: FileUpload,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image> {
        const fileName = uuid();
        const fileStream = image.createReadStream();
        return this.createImageFromStream(itemId, fileStream, imageType, image.mimetype, context);
    }

    public async createImageFromStream(
        itemId: number,
        imageStream: Stream,
        imageType: ImageType,
        mimeType: string,
        context: AuthenticatedContext
    ): Promise<Image> {
        const fileName = uuid();
        const formatter = ImageProcessorProvider.getImageProcessor(imageType, mimeType).getFormatter();
        await this.storageService.writeItem(ImageStorageService.NAMESPACE, fileName, imageStream, formatter);
        const imageEntity = this.buildImageEntity(fileName, itemId, context.me.id, imageType, mimeType);
        return this.getRepository(context.connection).save(imageEntity);
    }

    public async updateImage(
        imageEntity: Image,
        image: FileUpload,
        imageType: ImageType,
        context: AuthenticatedContext
    ): Promise<Image> {
        const fileStream = image.createReadStream();
        return this.updateImageFromStream(imageEntity, fileStream, imageType, image.mimetype, context);
    }

    private async updateImageFromStream(
        imageEntity: Image,
        imageStream: Stream,
        imageType: ImageType,
        mimeType: string,
        context: AuthenticatedContext
    ): Promise<Image> {
        const formatter = ImageProcessorProvider.getImageProcessor(imageType, mimeType).getFormatter();
        await this.storageService.writeItem(ImageStorageService.NAMESPACE, imageEntity.id, imageStream, formatter);
        return this.getRepository(context.connection).save(imageEntity);
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

    public async findImage(itemId: number, imageType: ImageType, connection: Connection): Promise<Image | undefined> {
        const repository = this.getRepository(connection);
        return repository.findOneEntityReferenceIdAndType(itemId, imageType);
    }

    private static convertBase64ToStream(base64: string): Stream {
        const buffer = ImageStorageService.convertBase64ToBuffer(base64);
        const bufferStream = new Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);
        return bufferStream;
    }

    private static convertBase64ToBuffer(base64: string): Buffer {
        const base64Content = base64.includes(";base64,") ? base64.split(";base64,")[1] : base64;
        return Buffer.from(base64Content, "base64");
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

    private getRepository(connection: Connection): ImageRepository {
        return connection.getCustomRepository(ImageRepository);
    }

    public async getImageTypeForUser(
        username: string,
        imageType: ImageType,
        connection: Connection
    ): Promise<ImageEntityAndStream> {
        validateUsername(username);

        const user = await connection.getCustomRepository(UserRepository).getUserByUsername(username);

        if (user == null) throw new Error("USER_NOT_FOUND");

        const image = await this.findImage(user.id, imageType, connection);

        if (image == null) throw new Error("IMAGE_NOT_FOUND");

        return this.readImage(image.id, connection);
    }
}
