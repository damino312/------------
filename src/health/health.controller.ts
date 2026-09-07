import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OllamaService } from '../ollama/ollama.service.js';
import {
  HealthResponseSchema,
  type HealthResponse,
} from '../schemas/health.schema.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Ping Ollama /api/tags to verify upstream availability',
  })
  @ApiOkResponse({
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded'], example: 'ok' },
        ollama: {
          type: 'string',
          enum: ['reachable', 'unreachable'],
          example: 'reachable',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-09-07T12:00:00.000Z',
        },
      },
    },
  })
  async getHealth(): Promise<HealthResponse> {
    const ollamaReachable = await this.ollamaService.checkHealth();

    return HealthResponseSchema.parse({
      status: ollamaReachable ? 'ok' : 'degraded',
      ollama: ollamaReachable ? 'reachable' : 'unreachable',
      timestamp: new Date().toISOString(),
    });
  }
}
