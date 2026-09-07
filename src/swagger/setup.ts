import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication, port: number): void {
  const config = new DocumentBuilder()
    .setTitle('CHIM Ollama Proxy')
    .setDescription(
      'OpenAI-compatible proxy between CHIM/HerikaServer and Ollama. ' +
        'Use the examples below to debug requests before connecting Skyrim.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Required only when PROXY_API_KEY is set in .env',
      },
      'proxy-api-key',
    )
    .addServer(`http://localhost:${port}`, 'Local')
    .addTag('chat', 'OpenAI-compatible chat completions (CHIM endpoint)')
    .addTag('health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 2,
      tryItOutEnabled: true,
    },
  });
}
