import { Controller, Patch, Param, NotFoundException } from '@nestjs/common';
import { RUNS, completeRun, failRun, cancelRun, getRunById } from '@squad/core';

@Controller('runs')
export class RunsController {
  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    const run = getRunById(RUNS, id);
    if (!run) throw new NotFoundException(`Run '${id}' not found`);
    return completeRun(run);
  }

  @Patch(':id/fail')
  fail(@Param('id') id: string) {
    const run = getRunById(RUNS, id);
    if (!run) throw new NotFoundException(`Run '${id}' not found`);
    return failRun(run);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    const run = getRunById(RUNS, id);
    if (!run) throw new NotFoundException(`Run '${id}' not found`);
    return cancelRun(run);
  }
}
