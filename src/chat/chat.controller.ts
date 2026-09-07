import {
  Body,
  Controller,
  Headers,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service.js';
import {
  ChatCompletionRequestSchema,
  type ChatCompletionRequest,
} from '../schemas/chat-completion.schema.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor.js';

@Controller()
@UseInterceptors(LoggingInterceptor)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('v1/chat/completions')
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
