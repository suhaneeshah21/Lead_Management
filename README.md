# Real Estate Lead Management CRM

MERN CRM with JWT authentication, role-based access, lead assignment, analytics, CSV import/export, Redis caching, and Docker Compose.

## Quick start

1. Copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET`, `ADMIN_BOOTSTRAP_KEY`, and `CORS_ORIGIN`.
2. Run `docker compose up --build`.
3. Open `http://localhost:3002` (or set `FRONTEND_PORT` to another available host port).
4. Bootstrap the first administrator with `POST /api/v1/auth/bootstrap` and header `x-bootstrap-key`.

For local development, run MongoDB and Redis, then run `npm install && npm run dev` in `backend` and `npm install && npm start` in `frontend`.

## API

All endpoints are under `/api/v1`. Auth uses `Authorization: Bearer <token>`. Main resources are `/auth`, `/users`, `/leads`, and `/dashboard`. Lead import uses multipart field `file`; download the template from `/leads/import/template`.
