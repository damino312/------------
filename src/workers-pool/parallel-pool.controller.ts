import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ParallelPoolService } from './parallel-pool.service.js';

@ApiTags('workers')
@Controller('workers')
export class ParallelPoolController {
  constructor(private readonly pool: ParallelPoolService) {}

  @Get('parallel-pool-demo')
  @ApiOperation({
    summary: 'Demo SharedArrayBuffer between Nest and worker_threads pool',
    description:
      'Workers claim task indices via Atomics on shared memory; Nest reads completed count from the same buffer.',
  })
  @ApiQuery({ name: 'tasks', required: false, example: 2000 })
  @ApiQuery({ name: 'workers', required: false, example: 4 })
  @ApiOkResponse({
    description: 'Pool stats',
  })
  async demo(
    @Query('tasks') tasksRaw?: string,
    @Query('workers') workersRaw?: string,
  ) {
    const taskCount = tasksRaw === undefined ? 2000 : Number(tasksRaw);
    const workerCount = workersRaw === undefined ? undefined : Number(workersRaw);
    return this.pool.runPool(taskCount, workerCount);
  }
}
