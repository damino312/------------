import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import sharp from 'sharp';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('ollama');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/media/thumbnail/worker (POST) returns JPEG', async () => {
    const png = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 255, g: 128, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const res = await request(app.getHttpServer())
      .post('/media/thumbnail/worker?maxWidth=240')
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);

    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
    expect(res.body.length).toBeGreaterThan(100);

    const meta = await sharp(res.body).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBeLessThanOrEqual(240);
  });
});
