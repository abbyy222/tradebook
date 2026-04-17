type RequestSample = {
  method: string
  path: string
  status: number
  durationMs: number
  at: number
}

type EndpointAggregate = {
  endpoint: string
  avgDurationMs: number
  maxDurationMs: number
  requests: number
}

type ErrorAggregate = {
  endpoint: string
  errors: number
}

const MAX_SAMPLES = 5000
const samples: RequestSample[] = []

const normalizePath = (path: string) => {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
}

const endpointKey = (sample: Pick<RequestSample, 'method' | 'path'>) =>
  `${sample.method.toUpperCase()} ${normalizePath(sample.path)}`

export const requestMetrics = {
  record(sample: RequestSample) {
    samples.push(sample)
    if (samples.length > MAX_SAMPLES) {
      samples.splice(0, samples.length - MAX_SAMPLES)
    }
  },

  getSummary(windowMs = 60 * 60 * 1000): {
    totalRequests: number
    errorRequests: number
    errorRate: number
    avgDurationMs: number
    p95DurationMs: number
    topSlowEndpoints: EndpointAggregate[]
    topErrorEndpoints: ErrorAggregate[]
  } {
    const from = Date.now() - windowMs
    const windowed = samples.filter((sample) => sample.at >= from)

    if (windowed.length === 0) {
      return {
        totalRequests: 0,
        errorRequests: 0,
        errorRate: 0,
        avgDurationMs: 0,
        p95DurationMs: 0,
        topSlowEndpoints: [],
        topErrorEndpoints: [],
      }
    }

    const totalRequests = windowed.length
    const errorRequests = windowed.filter((sample) => sample.status >= 500).length
    const avgDurationMs = windowed.reduce((sum, sample) => sum + sample.durationMs, 0) / totalRequests

    const sortedDurations = windowed.map((sample) => sample.durationMs).sort((a, b) => a - b)
    const p95Index = Math.min(sortedDurations.length - 1, Math.floor(sortedDurations.length * 0.95))
    const p95DurationMs = sortedDurations[p95Index]

    const byEndpoint = new Map<string, { totalDuration: number; maxDuration: number; requests: number; errors: number }>()
    for (const sample of windowed) {
      const key = endpointKey(sample)
      const current = byEndpoint.get(key) ?? { totalDuration: 0, maxDuration: 0, requests: 0, errors: 0 }

      current.totalDuration += sample.durationMs
      current.maxDuration = Math.max(current.maxDuration, sample.durationMs)
      current.requests += 1
      if (sample.status >= 500) current.errors += 1

      byEndpoint.set(key, current)
    }

    const topSlowEndpoints: EndpointAggregate[] = Array.from(byEndpoint.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDurationMs: Number((stats.totalDuration / stats.requests).toFixed(1)),
        maxDurationMs: stats.maxDuration,
        requests: stats.requests,
      }))
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
      .slice(0, 5)

    const topErrorEndpoints: ErrorAggregate[] = Array.from(byEndpoint.entries())
      .filter(([, stats]) => stats.errors > 0)
      .map(([endpoint, stats]) => ({
        endpoint,
        errors: stats.errors,
      }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 5)

    return {
      totalRequests,
      errorRequests,
      errorRate: Number(((errorRequests / totalRequests) * 100).toFixed(2)),
      avgDurationMs: Number(avgDurationMs.toFixed(1)),
      p95DurationMs,
      topSlowEndpoints,
      topErrorEndpoints,
    }
  },
}

