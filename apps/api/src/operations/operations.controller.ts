import { Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { OperationsService } from './operations.service';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('dashboard')
  getDashboard(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.operationsService.getDashboard(limit ?? 10);
  }

  @Get('rag-evals')
  listRagEvalRuns(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.operationsService.listRagEvalRuns(limit ?? 20);
  }

  @Post('validate-smoke')
  runSmokeValidation() {
    return this.operationsService.runSmokeValidation();
  }
}
