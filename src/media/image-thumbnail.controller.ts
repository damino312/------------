import {
  Controller,
  Header,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ImageThumbnailService } from './image-thumbnail.service.js';

@ApiTags('media')
@Controller('media')
export class ImageThumbnailController {
  constructor(private readonly thumbnails: ImageThumbnailService) {}

  @Post('thumbnail/worker')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create JPEG thumbnail in a worker thread (sharp)',
    description:
      'Typical backend task: accept an upload, run CPU/libvips work off the Nest event loop, return bytes.',
  })
  @ApiQuery({ name: 'maxWidth', required: false, example: 480 })
  @ApiQuery({ name: 'quality', required: false, example: 82 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'JPEG thumbnail bytes' })
  @Header('Content-Type', 'image/jpeg')
  async thumbnailInWorker(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('maxWidth') maxWidthRaw: string | undefined,
    @Query('quality') qualityRaw: string | undefined,
  ): Promise<StreamableFile> {
    const upload = this.thumbnails.assertUpload(file);
    const maxWidth = this.thumbnails.parseMaxWidth(maxWidthRaw);
    const quality = this.thumbnails.parseQuality(qualityRaw);
    const result = await this.thumbnails.createThumbnailInWorker(
      upload.buffer,
      maxWidth,
      quality,
    );
    return new StreamableFile(result.image, { type: 'image/jpeg' });
  }

  @Post('thumbnail/main')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Same thumbnail on the main thread (comparison only)',
  })
  @Header('Content-Type', 'image/jpeg')
  async thumbnailOnMain(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('maxWidth') maxWidthRaw: string | undefined,
    @Query('quality') qualityRaw: string | undefined,
  ): Promise<StreamableFile> {
    const upload = this.thumbnails.assertUpload(file);
    const maxWidth = this.thumbnails.parseMaxWidth(maxWidthRaw);
    const quality = this.thumbnails.parseQuality(qualityRaw);
    const result = await this.thumbnails.createThumbnailOnMainThread(
      upload.buffer,
      maxWidth,
      quality,
    );
    return new StreamableFile(result.image, { type: 'image/jpeg' });
  }
}
