# Brew & Bite Cafe

A full-stack cafe ordering application split into two applications:

- `frontend` — Vite, React, Tailwind CSS
- `backend` — Express API with JWT authentication and JSON file persistence

## Run locally

Open two terminals.

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5173`. Create an account, add food to the cart, and check out with online payment. The demo payment accepts any card number with at least 12 digits and creates a paid order.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/products`, `GET /api/products/:id`
- `POST /api/orders`, `GET /api/orders/my-orders`
- `POST /api/payments/confirm`

All order and payment routes require `Authorization: Bearer <token>`.
# cafe
