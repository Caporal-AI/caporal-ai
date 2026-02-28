import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { COMPUTE_CLIENT } from './compute-client.port';
import { FastApiComputeHttpAdapter } from './fastapi-compute-http.adapter';

@Module({
  imports: [HttpModule],
  providers: [
    FastApiComputeHttpAdapter,
    {
      provide: COMPUTE_CLIENT,
      useExisting: FastApiComputeHttpAdapter,
    },
  ],
  exports: [COMPUTE_CLIENT],
})
export class ComputeModule {}
