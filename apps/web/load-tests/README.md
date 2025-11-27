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
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

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

