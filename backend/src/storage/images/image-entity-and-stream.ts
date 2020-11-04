import {Image} from "../../entity/Image";
import {Stream} from "stream";

export interface ImageEntityAndStream {
    entity: Image,
    stream: Stream
}