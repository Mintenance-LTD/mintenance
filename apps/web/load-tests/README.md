# Load Testing Infrastructure

This directory contains load testing scripts and configurations for the Mintenance web application.

## Tools

- **K6**: High-performance load testing tool (recommended)
- **Artillery**: Alternative load testing tool

## Setup

### K6 Setup

1. Install K6:

   ```bash
   # macOS
   brew install k6

   # Windows
   choco install k6

   # Linux: follow the official installation documentation linked below.
   ```

Use the
[official Grafana installation instructions](https://grafana.com/docs/k6/latest/set-up/install-k6/).
CI pins k6 2.3.0 via the shared `.github/actions/setup-k6` action. See
[the bounded staging smoke test](k6/smoke.md) for configuration and verification.

2. Run K6 tests:
   ```bash
   cd apps/web/load-tests
   k6 run k6/critical-endpoints.js
   ```

### Artillery Setup

1. Install Artillery:

   ```bash
   npm install -g artillery
   ```

2. Run Artillery tests:
   ```bash
   cd apps/web/load-tests
   artillery run artillery/critical-endpoints.yml
   ```

## Test Scenarios

### Critical Endpoints

- User authentication (login, register)
- Job creation and listing
- Contractor bidding
- Payment processing
- Escrow approval

### Performance Benchmarks

- **Response Time**: < 500ms for 95th percentile
- **Throughput**: > 100 requests/second
- **Error Rate**: < 1%
- **Concurrent Users**: Support 1000+ concurrent users

## Running Tests

### Local Development

```bash
# Start dev server
npm run dev

# In another terminal, run load tests
cd apps/web/load-tests
k6 run k6/critical-endpoints.js
```

### CI/CD

Load tests run automatically in CI/CD pipeline on scheduled basis.

## Monitoring

Load test results are logged and can be viewed in:

- CI/CD artifacts
- Performance monitoring dashboard
- Application logs
