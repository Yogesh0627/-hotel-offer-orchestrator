# Hotel Offer Orchestrator

A small backend service that fetches hotel offers from two suppliers, compares them, removes duplicate hotels, and returns the cheapest offer for each hotel.

The comparison is handled through a Temporal workflow, while Redis is used to store the final hotel list and handle price-range filtering.

## Tech Stack

* Node.js
* TypeScript
* Express.js
* Temporal
* Redis
* Docker / Docker Compose
* PostgreSQL (used by Temporal)
* Pino for logging

## How it works

The request starts from the Express API.

```text
Client
  |
  v
Express API
  |
  v
Temporal Workflow
  |
  +---- Supplier A
  |
  +---- Supplier B
  |
  v
Merge + Deduplicate
  |
  v
Save results to Redis
  |
  v
Filter by price (Redis)
  |
  v
Response
```

For every hotel name, only one offer is kept.

If the same hotel is available from both suppliers, the cheaper offer is selected.

For example, if:

```text
Supplier A -> Holtin -> 6000
Supplier B -> Holtin -> 5340
```

the final result contains the Supplier B offer.

---

## Project Structure

```text
hotel-offer-orchestrator/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── app.ts
│   │
│   ├── redis/
│   │   ├── redis.client.ts
│   │   └── hotel-redis.service.ts
│   │
│   ├── suppliers/
│   │   ├── supplier-a.data.ts
│   │   └── supplier-b.data.ts
│   │
│   ├── temporal/
│   │   ├── activities/
│   │   ├── workflows/
│   │   ├── client.ts
│   │   └── worker.ts
│   │
│   ├── types/
│   ├── utils/
│   └── server.ts
│
├── postman/
│   └── hotel-offer-orchestrator.postman_collection.json
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

To run the project locally without Docker, you need:

* Node.js 22+
* Redis
* Temporal Server

For the recommended setup, Docker Desktop is enough because Redis, Temporal, PostgreSQL, the API, and the Temporal worker are started using Docker Compose.

---

# Running with Docker Compose

This is the easiest way to run the complete project.

### 1. Clone the repository

```bash
git clone <repository-url>
cd hotel-offer-orchestrator
```

### 2. Create the environment file

```bash
cp .env.example .env
```

The default values are suitable for local development.

### 3. Start everything

```bash
docker compose up --build
```

This starts:

* Redis
* PostgreSQL
* Temporal
* API
* Temporal Worker

Once the containers are running, the API will be available at:

```text
http://localhost:3000
```

### 4. Check the containers

```bash
docker compose ps
```

The API, Redis and PostgreSQL containers should show as healthy/running.

### 5. Stop the application

```bash
docker compose down
```

To also remove the stored Redis and PostgreSQL volumes:

```bash
docker compose down -v
```

---

# Environment Variables

The main environment variables are:

```env
PORT=3000

REDIS_URL=redis://localhost:6379

TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=hotel-offer-task-queue

LOG_LEVEL=info
NODE_ENV=development

MOCK_SUPPLIER_A_DOWN=false
MOCK_SUPPLIER_B_DOWN=false
```

Docker Compose overrides the service addresses so that containers can communicate with each other.

For example:

```text
REDIS_URL=redis://redis:6379
TEMPORAL_ADDRESS=temporal:7233
SUPPLIER_BASE_URL=http://api:3000
```

---

# API Endpoints

## Get Hotels

```http
GET /api/hotels?city=delhi
```

The workflow calls both suppliers in parallel, compares the offers and returns one offer per hotel.

Example response:

```json
{
  "success": true,
  "message": "hotels list",
  "warnings": [],
  "hotels": [
    {
      "hotelId": "b1",
      "name": "Holtin",
      "price": 5340,
      "city": "delhi",
      "commissionPct": 20,
      "supplier": "Supplier B"
    },
    {
      "hotelId": "a2",
      "name": "Radison",
      "price": 5900,
      "city": "delhi",
      "commissionPct": 13,
      "supplier": "Supplier A"
    }
  ]
}
```

## Filter Hotels by Price

```http
GET /api/hotels?city=delhi&minPrice=5000&maxPrice=7000
```

The final hotel list is stored in Redis and the price filtering is performed using a Redis sorted set.

For example:

```text
minPrice = 5000
maxPrice = 7000
```

will return hotels whose prices fall within that range.

Both values are optional, so these are also supported:

```http
GET /api/hotels?city=delhi&minPrice=6000
```

```http
GET /api/hotels?city=delhi&maxPrice=6000
```

---

# Supplier APIs

The project contains two mock supplier APIs.

### Supplier A

```http
GET /supplierA/hotels?city=delhi
```

### Supplier B

```http
GET /supplierB/hotels?city=delhi
```

The suppliers contain overlapping hotel names so that the comparison and deduplication logic can be tested.

The current sample data includes:

```text
Supplier A
-----------
Holtin       6000
Radison      5900
Taj Palace   8000


Supplier B
-----------
Holtin       5340
Radison      6200
Marriott     7000
```

After comparison:

```text
Holtin       5340  -> Supplier B
Radison      5900  -> Supplier A
Marriott     7000  -> Supplier B
Taj Palace   8000  -> Supplier A
```

---

# Temporal Workflow

The main workflow is:

```text
hotelWorkflow(city)
```

The two supplier activities are started in parallel.

```ts
await Promise.allSettled([
  fetchSupplierAHotels(city),
  fetchSupplierBHotels(city),
]);
```

Using `Promise.allSettled()` allows the workflow to continue when one supplier is unavailable.

The workflow then:

1. Collects the available supplier results.
2. Deduplicates hotels by name.
3. Compares prices when the same hotel exists in both suppliers.
4. Keeps the cheaper offer.
5. Saves the final list to Redis.
6. Returns the result.

If both suppliers are unavailable, the workflow fails and the API returns a `503` response.

---

# Redis

Redis is used for two things:

1. Storing the final de-duplicated hotel offers.
2. Filtering hotels by price.

Each hotel is stored separately.

Example key:

```text
hotel:delhi:holtin
```

A Redis sorted set is also maintained for each city:

```text
hotels:price:delhi
```

The hotel price is used as the sorted-set score.

For example:

```text
hotel:delhi:holtin       5340
hotel:delhi:radison      5900
hotel:delhi:marriott     7000
hotel:delhi:taj palace   8000
```

When a price range is requested, Redis's sorted-set range operation is used to get only the matching hotels.

---

# Handling Supplier Failures

Supplier failures can be simulated using environment variables.

To make Supplier A unavailable:

```env
MOCK_SUPPLIER_A_DOWN=true
```

To make Supplier B unavailable:

```env
MOCK_SUPPLIER_B_DOWN=true
```

For example, if Supplier A is down but Supplier B is available, the API still returns Supplier B's results and includes a warning:

```json
{
  "success": true,
  "message": "hotels list",
  "warnings": [
    "Supplier A is currently unavailable"
  ],
  "hotels": []
}
```

If both suppliers are unavailable, the API returns an error instead of returning an empty successful result.

Supplier activity errors are also configured so that server-side supplier failures and network failures can be retried by Temporal.

---

# Health Check

A health endpoint is available at:

```http
GET /health
```

It checks the application's main dependencies, including:

* Redis
* Temporal
* Supplier A
* Supplier B

Example:

```json
{
  "success": true,
  "status": "healthy",
  "dependencies": {
    "redis": {
      "status": "up"
    },
    "temporal": {
      "status": "up"
    },
    "suppliers": {
      "supplierA": {
        "status": "up",
        "statusCode": 200
      },
      "supplierB": {
        "status": "up",
        "statusCode": 200
      }
    }
  }
}
```

The health endpoint is also used by Docker as the API container health check.

---

# Error Handling and Logging

The API uses a common error handler for request errors.

Examples of invalid requests include:

```text
Missing city
Invalid minPrice
Invalid maxPrice
minPrice greater than maxPrice
```

The application also logs incoming requests, response status codes, request duration, supplier failures, Redis operations, and workflow-related activity.

Logs are handled using Pino.

---

# Running Without Docker

If you want to run the Node.js application directly:

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Start the API

```bash
npm start
```

### Start the Temporal worker

In another terminal:

```bash
npm run worker
```

For development, the API can be started with:

```bash
npm run dev
```

Redis and Temporal still need to be running separately when using this setup.

---

# Postman Collection

A Postman collection is included in:

```text
postman/hotel-offer-orchestrator.postman_collection.json
```

It contains requests for:

* Health check
* Delhi hotel listing
* Delhi hotel price filtering
* City with no results
* Missing city
* Invalid price values
* Invalid price range
* Supplier A
* Supplier B
* Supplier failure scenarios

Import the collection into Postman and make sure the application is running on:

```text
http://localhost:3000
```

---

# Useful Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build TypeScript
npm run build

# Run compiled API
npm start

# Run Temporal worker locally
npm run worker

# Type check
npm run typecheck

# Start Docker environment
docker compose up --build

# Stop Docker environment
docker compose down

# View logs
docker compose logs -f

# View API logs
docker compose logs -f api

# View worker logs
docker compose logs -f worker
```

---

# Notes

The supplier APIs in this project are mock APIs. Their data is kept locally in the application and is used to demonstrate the orchestration, comparison, deduplication, Redis filtering, and failure-handling flow.

Temporal uses PostgreSQL for its own persistence in the Docker Compose setup. PostgreSQL is not used as the application's hotel data store.
