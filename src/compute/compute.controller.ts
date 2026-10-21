import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ComputeService } from './compute.service.js';

@ApiTags('compute')
@Controller('compute')
export class ComputeController {
  constructor(private readonly computeService: ComputeService) {}

  @Get('primes/worker')
  @ApiOperation({
    summary: 'Count primes in a worker thread',
    description:
      'Runs CPU-heavy sieve in node:worker_threads so the Nest event loop stays responsive.',
  })
  @ApiQuery({ name: 'limit', required: true, example: 500_000 })
  @ApiOkResponse({
    description: 'Prime count computed in worker thread',
  })
  async countPrimesInWorker(@Query('limit') limitRaw: string | undefined) {
    const limit = this.computeService.parseLimit(limitRaw);
    return this.computeService.runPrimeCountInWorker(limit);
  }

  @Get('primes/main')
  @ApiOperation({
    summary: 'Count primes on the main thread (demo only)',
    description:
      'Same algorithm on the Nest process main thread — blocks other requests while running.',
  })
  @ApiQuery({ name: 'limit', required: true, example: 200_000 })
  @ApiOkResponse({
    description: 'Prime count computed on main thread',
  })
  countPrimesOnMain(@Query('limit') limitRaw: string | undefined) {
    const limit = this.computeService.parseLimit(limitRaw);
    return this.computeService.runPrimeCountOnMainThread(limit);
  }
}
