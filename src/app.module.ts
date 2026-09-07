import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv, ENV_CONFIG } from './config/configuration.js';
import { ChatController } from './chat/chat.controller.js';
import { ChatService } from './chat/chat.service.js';
import { OllamaService } from './ollama/ollama.service.js';
import { ToolsAdapter } from './tools/tools.adapter.js';
import { HealthController } from './health/health.controller.js';
import { ProxyAuthService } from './common/guards/proxy-auth.service.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
  controllers: [ChatController, HealthController],
  providers: [
    {
      provide: ENV_CONFIG,
      useFactory: () => validateEnv(process.env as Record<string, unknown>),
    },
    ChatService,
    OllamaService,
    ToolsAdapter,
    ProxyAuthService,
    LoggingInterceptor,
  ],
})
export class AppModule {}
