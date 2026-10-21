import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import sharp from 'sharp';
import { ImageWorkerService } from './image-worker.service.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_WIDTH = 480;
const DEFAULT_QUALITY = 82;

@Injectable()
export class ImageThumbnailService {
  constructor(private readonly imageWorker: ImageWorkerService) {}

  assertUpload(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Multipart field "file" with an image is required');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(`Max upload size is ${MAX_UPLOAD_BYTES} bytes`);
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image/* uploads are supported');
    }
    return file;
  }

  parseMaxWidth(raw: string | undefined): number {
    const maxWidth = raw === undefined ? DEFAULT_MAX_WIDTH : Number(raw);
    if (!Number.isInteger(maxWidth) || maxWidth < 64 || maxWidth > 4096) {
      throw new BadRequestException('Query "maxWidth" must be an integer from 64 to 4096');
    }
    return maxWidth;
  }

  parseQuality(raw: string | undefined): number {
    const quality = raw === undefined ? DEFAULT_QUALITY : Number(raw);
    if (!Number.isInteger(quality) || quality < 40 || quality > 100) {
      throw new BadRequestException('Query "quality" must be an integer from 40 to 100');
    }
    return quality;
  }

  /** Same work on main thread — for comparing latency / blocking behavior. */
  async createThumbnailOnMainThread(
    image: Buffer,
    maxWidth: number,
    quality: number,
  ) {
    const started = performance.now();
    const { data, info } = await sharp(image, { failOn: 'none' })
      .rotate()
      .resize({ width: maxWidth, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return {
      image: data,
      width: info.width,
      height: info.height,
      format: 'jpeg' as const,
      durationMs: Math.round(performance.now() - started),
      thread: 'main' as const,
    };
  }

  createThumbnailInWorker(image: Buffer, maxWidth: number, quality: number) {
    return this.imageWorker.createThumbnail(image, maxWidth, quality);
  }
}
