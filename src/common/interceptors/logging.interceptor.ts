import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { ENV_CONFIG } from '../../config/configuration.js';
import type { EnvConfig } from '../../config/env.schema.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const started = Date.now();

    if (!req.path.includes('/v1/chat/completions')) {
      return next.handle();
    }

    const body = req.body as Record<string, unknown> | undefined;

    this.log('info', 'Incoming chat completion request', {
      model: body?.model,
      messageCount: Array.isArray(body?.messages) ? body.messages.length : 0,
      hasTools: Array.isArray(body?.tools) && body.tools.length > 0,
      maxTokens: body?.max_tokens,
      temperature: body?.temperature,
      stream: body?.stream,
    });

    if (this.env.LOG_REQUEST_BODY) {
      this.log('debug', 'Request body', body);
    }

    res.on('finish', () => {
      const durationMs = Date.now() - started;
      this.log('info', 'Chat completion response finished', {
        statusCode: res.statusCode,
        durationMs,
      });
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          if (!body?.stream && data && this.env.LOG_LEVEL === 'debug') {
            const preview = JSON.stringify(data).slice(0, 200);
            this.log('debug', 'Response preview', { preview });
          }
        },
      }),
    );
  }

  private log(
    level: 'debug' | 'info' | 'warn',
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    const levels = { debug: 0, info: 1, warn: 2 };
    const configured = levels[this.env.LOG_LEVEL];

    if (levels[level] < configured) {
      return;
    }

    const formatted = meta ? `${message} ${JSON.stringify(meta)}` : message;

    if (level === 'debug') {
      this.logger.debug(formatted);
    } else if (level === 'warn') {
      this.logger.warn(formatted);
    } else {
      this.logger.log(formatted);
    }
  }
}
