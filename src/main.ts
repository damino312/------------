import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENV_CONFIG } from './config/configuration.js';
import type { EnvConfig } from './config/env.schema.js';
import { setupSwagger } from './swagger/setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  app.enableCors();

  const env = app.get<EnvConfig>(ENV_CONFIG);
  setupSwagger(app, env.PORT);
  await app.listen(env.PORT, env.HOST);

  console.log(
    `CHIM Ollama proxy listening on http://${env.HOST}:${env.PORT}`,
  );
  console.log(`Swagger UI: http://localhost:${env.PORT}/docs`);
}

await bootstrap();
