## Backward-Compatible Contract Evolution

Follow additive changes only: new optional fields, new endpoints (/v2/), and never remove or change existing fields. Semantic versioning with clear, stable API contracts. This ensures that existing old clients continue working as expected while new clients access enhanced functionality through versioned endpoints.

## Retries, Timeouts & Circuit Breakers

Default configurations: 3 retries with exponential backoff + jitter, 10s timeouts, circuit breaker at 50% error rate. Budgets set based on SLA requirements and upstream service performance. Timeouts are set to be less than the client timeout minus expected overhead. Retry budgets are at under 5% of total traffic to prevent overhead.

## Idempotency Strategies

To support safe request deduplication, impelement the Idempotency-Key header with request deduplication (key + operation + body hash). Store processed keys with TTL. For replays, return previous response. Cryptographic hashing ensures different content with same key is rejected. Idempotent DELETE and PUT are idempotent, by design.

## Observability

Emit: RED metrics (Rate/Errors/Duration), integration latency histograms, circuit breaker state changes, cache hit rates, and upstream health checks. Structured logs with correlation IDs. Distributed traces showing full request flow across services.

## Security Controls

JWT validation at edge, RBAC, strict input validation with schemas, rate limiting per client/IP, env-based config with secret management, SSRF protection via allowlisted domains, network policies restricting egress traffic, regular security scanning.

## Preferred Framework/Tooling

Node.js + TypeScript for async I/O performance in integration scenarios. Express for simplicity, Axios for HTTP, Jest for testing. Docker for consistency, Redis for distributed caching. Ideal for high-throughput API gateways with excellent ecosystem support.
