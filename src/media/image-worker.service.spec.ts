import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ImageWorkerService } from './image-worker.service.js';

describe('ImageWorkerService', () => {
  it('resizes a real PNG in a worker thread via sharp', async () => {
    const source = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 20, g: 120, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const service = new ImageWorkerService();
    const result = await service.createThumbnail(source, 320, 80);

    expect(result.thread).toBe('worker');
    expect(result.format).toBe('jpeg');
    expect(result.width).toBeLessThanOrEqual(320);
    expect(result.height).toBeGreaterThan(0);
    expect(result.image.length).toBeGreaterThan(100);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const meta = await sharp(result.image).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(result.width);

    service.onModuleDestroy();
  });
});
