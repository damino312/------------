import { parentPort, workerData } from 'node:worker_threads';
import sharp from 'sharp';

export interface ImageThumbnailWorkerInput {
  image: Buffer;
  maxWidth: number;
  quality: number;
}

export interface ImageThumbnailWorkerOutput {
  image: Buffer;
  width: number;
  height: number;
  format: 'jpeg';
}

const input = workerData as ImageThumbnailWorkerInput;

const pipeline = sharp(input.image, { failOn: 'none' })
  .rotate()
  .resize({
    width: input.maxWidth,
    fit: 'inside',
    withoutEnlargement: true,
  })
  .jpeg({ quality: input.quality, mozjpeg: true });

const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

const output: ImageThumbnailWorkerOutput = {
  image: data,
  width: info.width,
  height: info.height,
  format: 'jpeg',
};

parentPort?.postMessage(output);
