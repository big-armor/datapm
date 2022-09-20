import { SchemaDirectiveVisitor, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver, GraphQLArgument, GraphQLObjectType, GraphQLInterfaceType } from "graphql";
import { Context } from "../context";
import { FileUpload } from "graphql-upload";
import { Base64ImageUpload, IMAGE_UPLOAD_ERROR_TYPE } from "../generated/graphql";
import { ValidateImageUploadDirective } from "./ValidImageUploadDirective";

export class ValidBase64ImageUploadDirective extends SchemaDirectiveVisitor {
    private static readonly IMAGE_SIZE_LIMIT_IN_BYTES = 10_000_000; // 10MB (Also defined in index.ts)
    private static readonly BASE64_TAG = ";base64,";
    private static readonly BASE64_DATA_TAG = "data:";

    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        details.field.resolve = async function (source, args, context: Context, info) {
            const imageUpload: Base64ImageUpload | undefined = args.image || args.value?.image || undefined;
            self.validateImage(imageUpload);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    private validateImage(image: Base64ImageUpload | undefined): void {
        if (!image || !image.base64) {
            throw new ValidationError(IMAGE_UPLOAD_ERROR_TYPE.IMAGE_NOT_INITIALIZED);
        }

        const base64Split = image.base64.split(ValidBase64ImageUploadDirective.BASE64_TAG);
        let base64ImageContent;
        if (base64Split.length === 1) {
            base64ImageContent = base64Split[0];
        } else {
            const mimeType = this.extractMimeTypeFromBase64DataFlag(base64Split[0]);
            if (!ValidateImageUploadDirective.isValidMimeType(mimeType)) {
                throw new ValidationError(IMAGE_UPLOAD_ERROR_TYPE.IMAGE_FORMAT_NOT_SUPPORTED);
            }
            base64ImageContent = base64Split[1];
        }

        const imageSizeInBytes = this.calculateLengthInBytesFromBase64(base64ImageContent);
        if (imageSizeInBytes > ValidBase64ImageUploadDirective.IMAGE_SIZE_LIMIT_IN_BYTES) {
            throw new Error(IMAGE_UPLOAD_ERROR_TYPE.IMAGE_TOO_LARGE);
        }
    }

    private extractMimeTypeFromBase64DataFlag(mimeTypeWithDataFlag: string): string {
        return mimeTypeWithDataFlag.split(ValidBase64ImageUploadDirective.BASE64_DATA_TAG)[1];
    }

    private calculateLengthInBytesFromBase64(base64: string): number {
        if (!base64) {
            return -1.0;
        }

        let padding = 0;
        if (base64.endsWith("==")) {
            padding = 2;
        } else if (base64.endsWith("=")) {
            padding = 1;
        }

        return Math.ceil(base64.length / 4) * 3 - padding;
    }
}
