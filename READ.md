# Integration Gateway

API Gateway orchestrating ERP and Warehouse services with resilience patterns.

## Getting Start

### Install dependencies

npm install

### Start mock upstream services (Terminal 1)

node scripts/mock-servers.js

### Start gateway (Terminal 2)

npm run dev

* Check with open : http://localhost:8080/v1/products

* check with open : http://localhost:8080/health/detailed

### Run unit test

npm test (or add the indival unit test file name)

