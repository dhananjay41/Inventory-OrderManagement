# Inventory & Order Management System

A full-stack application for managing products, customers, orders, and inventory tracking.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.12) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL 16 |
| Infrastructure | Docker + Docker Compose |

## Features

- **Products** — CRUD with unique SKU enforcement and stock tracking
- **Customers** — CRUD with unique email enforcement
- **Orders** — Create orders with multiple items; automatic stock deduction on creation; stock restored on cancellation/deletion
- **Inventory validation** — Orders blocked when stock is insufficient
- **Dashboard** — Stats overview and recent orders

## Getting Started

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env and set a secure POSTGRES_PASSWORD
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/api/docs |

### 3. Local development (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Set DATABASE_URL in .env pointing to a local PostgreSQL
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # proxies /api to http://localhost:8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List all products |
| POST | /api/products | Create product |
| PUT | /api/products/{id} | Update product |
| DELETE | /api/products/{id} | Delete product |
| GET | /api/customers | List all customers |
| POST | /api/customers | Create customer |
| PUT | /api/customers/{id} | Update customer |
| DELETE | /api/customers/{id} | Delete customer |
| GET | /api/orders | List all orders |
| POST | /api/orders | Create order (validates & deducts stock) |
| PATCH | /api/orders/{id}/status | Update order status |
| DELETE | /api/orders/{id} | Delete order (restores stock) |
| GET | /api/stats | Dashboard statistics |

## Business Rules

- Product SKUs must be unique
- Customer emails must be unique
- Orders cannot be created when any product has insufficient stock
- Stock is automatically reduced when an order is created
- Stock is restored when an order is cancelled or deleted (unless delivered)
