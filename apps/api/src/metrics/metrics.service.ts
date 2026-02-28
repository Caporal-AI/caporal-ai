import { Injectable } from '@nestjs/common';

interface MetricsSnapshot {
  feasible_rate: number;
  hard_constraints_violations: number;
  rag_guardrail_triggers: number;
  p95_latency_api_ms: number;
  p95_latency_compute_ms: number;
  p95_latency_projection_ms: number;
  diet_runs_total: number;
  projection_calls_total: number;
}

@Injectable()
export class MetricsService {
  private dietRunsTotal = 0;
  private feasibleRuns = 0;
  private hardConstraintsViolations = 0;
  private ragGuardrailTriggers = 0;
  private projectionCallsTotal = 0;

  private readonly apiLatenciesMs: number[] = [];
  private readonly computeLatenciesMs: number[] = [];
  private readonly projectionLatenciesMs: number[] = [];

  recordDietRun(feasible: boolean, hardViolations: number, apiLatencyMs: number, computeLatencyMs: number): void {
    this.dietRunsTotal += 1;
    if (feasible) {
      this.feasibleRuns += 1;
    }
    this.hardConstraintsViolations += hardViolations;

    this.pushLatency(this.apiLatenciesMs, apiLatencyMs);
    this.pushLatency(this.computeLatenciesMs, computeLatencyMs);
  }

  recordAssistantCall(apiLatencyMs: number, computeLatencyMs: number, guardrailTriggered: boolean): void {
    this.pushLatency(this.apiLatenciesMs, apiLatencyMs);
    this.pushLatency(this.computeLatenciesMs, computeLatencyMs);

    if (guardrailTriggered) {
      this.ragGuardrailTriggers += 1;
    }
  }

  recordProjectionCall(latencyMs: number): void {
    this.projectionCallsTotal += 1;
    this.pushLatency(this.projectionLatenciesMs, latencyMs);
  }

  getSnapshot(): MetricsSnapshot {
    return {
      feasible_rate: this.dietRunsTotal === 0 ? 0 : this.feasibleRuns / this.dietRunsTotal,
      hard_constraints_violations: this.hardConstraintsViolations,
      rag_guardrail_triggers: this.ragGuardrailTriggers,
      p95_latency_api_ms: this.p95(this.apiLatenciesMs),
      p95_latency_compute_ms: this.p95(this.computeLatenciesMs),
      p95_latency_projection_ms: this.p95(this.projectionLatenciesMs),
      diet_runs_total: this.dietRunsTotal,
      projection_calls_total: this.projectionCallsTotal,
    };
  }

  private pushLatency(bucket: number[], value: number): void {
    bucket.push(Math.max(0, Math.round(value)));

    if (bucket.length > 500) {
      bucket.shift();
    }
  }

  private p95(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    return sorted[index] ?? 0;
  }
}
