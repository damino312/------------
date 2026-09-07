import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ChatCompletionRequest } from '../schemas/chat-completion.schema.js';
import { OllamaService, OllamaRequestError } from '../ollama/ollama.service.js';
import { ProxyAuthService } from '../common/guards/proxy-auth.service.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly proxyAuthService: ProxyAuthService,
  ) {}

  validateAuth(authorization?: string): void {
    this.proxyAuthService.validate(authorization);
  }

  async createCompletion(
    request: ChatCompletionRequest,
    res: Response,
  ): Promise<unknown> {
    try {
      if (request.stream) {
        await this.ollamaService.createCompletion(request, res);
        return;
      }

      return await this.ollamaService.createCompletion(request);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof OllamaRequestError) {
        throw new InternalServerErrorException({
          error: error.message,
          ollamaStatus: error.status,
        });
      }

      throw error;
    }
  }
}
