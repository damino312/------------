import {
  Body,
  Controller,
  Headers,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatService } from './chat.service.js';
import {
  ChatCompletionRequestSchema,
  type ChatCompletionRequest,
} from '../schemas/chat-completion.schema.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor.js';
import {
  chatCompletionOpenApiSchema,
  chatCompletionRequestExamples,
} from '../swagger/chat-completion.examples.js';

@ApiTags('chat')
@Controller()
@UseInterceptors(LoggingInterceptor)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('v1/chat/completions')
  @ApiOperation({
    summary: 'Create chat completion',
    description:
      'OpenAI-compatible endpoint used by CHIM/HerikaServer. ' +
      'Select an example below — **Non-stream (debug)** returns readable JSON in Swagger UI.',
  })
  @ApiBearerAuth('proxy-api-key')
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description: 'Bearer token (required when PROXY_API_KEY is set)',
  })
  @ApiBody({
    schema: chatCompletionOpenApiSchema,
    examples: chatCompletionRequestExamples,
  })
  @ApiProduces('application/json', 'text/event-stream')
  @ApiResponse({
    status: 200,
    description: 'Completion result (JSON when stream=false, SSE when stream=true)',
  })
  @ApiResponse({ status: 400, description: 'Validation error (Zod)' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 500, description: 'Ollama upstream error' })
  async createCompletion(
    @Body(new ZodValidationPipe(ChatCompletionRequestSchema))
    body: ChatCompletionRequest,
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ) {
    this.chatService.validateAuth(authorization);

    const result = await this.chatService.createCompletion(body, res);

    if (!body.stream && result !== undefined) {
      res.json(result);
    }
  }
}
