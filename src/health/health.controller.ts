import { Controller, Get } from '@nestjs/common';
import { OllamaService } from '../ollama/ollama.service.js';
import {
  HealthResponseSchema,
  type HealthResponse,
} from '../schemas/health.schema.js';

@Controller()
export class HealthController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    const ollamaReachable = await this.ollamaService.checkHealth();

    return HealthResponseSchema.parse({
      status: ollamaReachable ? 'ok' : 'degraded',
      ollama: ollamaReachable ? 'reachable' : 'unreachable',
      timestamp: new Date().toISOString(),
    });
  }
}
