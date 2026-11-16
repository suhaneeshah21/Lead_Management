# Real Estate Lead Management CRM

A full-stack lead management CRM for real estate teams, built with the MERN stack. It supports admin and agent workflows, agent-based lead ownership, lead lifecycle tracking, dashboard analytics, and CSV import/export. The backend uses a layered architecture with JWT authentication, role-based access control (RBAC), and Redis caching, and runs on Render with MongoDB Atlas and Upstash Redis.

## Live Demo

**[https://lead-management-1-30q8.onrender.com](https://lead-management-1-30q8.onrender.com/login)**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin1234!` |
| Agent | `agent@example.com` | `Agent1234!` |

Things to try:

- Log in as **admin** to see organization-wide leads, the dashboard, and the Users page.
- Log in as **agent** to see that only leads assigned to that agent are visible. This is enforced on the backend, not just hidden in the UI.
- Import leads from CSV, add notes, change a lead's status, and watch the activity history update.

Notes on the demo:

- The demo runs on free-tier hosting. If the server has been idle, the first sign-in can take up to a minute. The login page shows a "server is waking up" message and retries automatically.
- Demo accounts are shared and **read-only for user management**: they cannot create, edit, delete or reset passwords for any user, and cannot change their own password. Lead data is fully editable and is reset periodically.
- Please don't enter real personal information.

## Features

- JWT authentication with protected routes and forced password changes for new users.
- Role-based access for `admin` and `agent` users.
- Lead creation, editing, viewing, notes, follow-up dates, and an activity timeline.
- Lead statuses: `New`, `Contacted`, `Site Visit`, and `Closed`.
- Search across lead name, phone, and email, with status and source filters, sorting, and pagination.
- Automatic lead scoping: agents can only list and manage leads assigned to their own user ID; admins see all leads.
- Admin user management: create agents or admins, activate/deactivate, reset passwords, delete.
- Last-admin protection: the system refuses to delete, demote or deactivate the last active admin.
- Dashboard metrics for lead counts, conversion, status and source distribution, budgets, and follow-ups.
- CSV import with per-row validation and partial-failure reporting, a downloadable import template, and CSV export.
- Redis cache-aside layer with automatic invalidation for dashboard data, with a MongoDB fallback when Redis is unavailable.
- Request validation, rate limiting, security headers, compression, structured logging, and centralized error handling.
- Cold-start tolerant login: 60-second request timeout, automatic retries on network failures and 502/503/504 responses, and a clear "server is waking up" message.
- Docker Compose setup for MongoDB, Redis, backend, and frontend services.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, React Router 6, Axios, Recharts, Vite |
| Backend | Node.js 18+, Express, Mongoose, JWT, bcryptjs |
| Database | MongoDB 6 (MongoDB Atlas in production) |
| Cache | Redis 7 (Upstash in production) |
| Security | Helmet, CORS, express-validator, express-rate-limit |
| Operations | Docker, Docker Compose, Winston, Morgan, Nginx, Render |

## Architecture

The backend is organized into layers:

```text
Routes -> Controllers -> Services -> Repositories -> Mongoose Models -> MongoDB
```

- **Routes** mount endpoints and attach middleware.
- **Controllers** translate HTTP requests and responses.
- **Services** implement authorization and business rules.
- **Repositories** contain database access methods.
- **Models** define MongoDB schemas and indexes.
- **Middleware** handles authentication, validation, rate limiting, and errors.

The frontend uses React Router for navigation, React Context for authentication state, Axios for API requests, and page-level components for the dashboard, leads, users, and account workflows.

## Quick Start With Docker

### Prerequisites

- Docker Desktop with Docker Compose
- Port `3002` available

### Start the application

```bash
docker compose up --build -d
```

Open the frontend at [http://localhost:3002](http://localhost:3002).

The Compose backend listens on port `5000` inside the Docker network. It is not published to the host by default; API requests from the containerized frontend follow the upstream configured in `frontend/nginx.conf`. To check the backend directly, publish port `5000` in `docker-compose.yml` or run the backend outside Docker. The health endpoint is:

```text
http://localhost:5000/health
```

The Compose backend uses MongoDB at `mongodb:27017` and Redis at `redis:6379`. Set `FRONTEND_PORT` to change the frontend host port:

```bash
FRONTEND_PORT=3005 docker compose up --build -d
```

### Create the first admin

There are two ways to create the first admin. Both are rejected once an admin already exists.

**Option 1: seed script (recommended for local setup).** `ADMIN_EMAIL` and `ADMIN_PASSWORD` are required; there are no defaults.

```bash
docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='choose-a-strong-password' backend npm run seed:admin
```

**Option 2: bootstrap endpoint.** This requires `ADMIN_BOOTSTRAP_KEY` to be set on the server. If it is not set, the endpoint rejects every request.

```bash
curl -X POST http://localhost:5000/api/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-key: <your ADMIN_BOOTSTRAP_KEY>" \
  -d '{"name":"CRM Admin","email":"you@example.com","password":"choose-a-strong-password"}'
```

Optional sample data: `docker compose exec backend npm run seed:leads` adds a few sample leads assigned to the first active agent (or the admin if there is no agent).

Stop the stack with:

```bash
docker compose down
```

Add `-v` only when you intentionally want to remove the persisted MongoDB volume.

## Local Development

### Requirements

- Node.js 18 or newer
- MongoDB 6 or a compatible deployment
- Redis 7 or a compatible deployment

Install dependencies from the repository root:

```bash
npm run install:all
```

Start the backend:

```bash
cd backend
npm run dev
```

The API listens on `http://localhost:5000` by default.

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Vite prints the frontend URL when it starts, normally `http://localhost:5173`.

## Environment Variables

Create `backend/.env` for local development (see `backend/.env.example`):

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/realestatecrm
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
ADMIN_BOOTSTRAP_KEY=replace-with-a-long-random-secret
```

Frontend configuration is provided through Vite. The API client uses `/api/v1` by default; set `VITE_API_URL` when the API is hosted at a different origin:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```

`ADMIN_BOOTSTRAP_KEY` has no default value. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Never commit `.env` files or real credentials. The Docker Compose file supplies service-to-service URLs and supports overriding `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `ADMIN_BOOTSTRAP_KEY`, and `FRONTEND_PORT` through the shell or an environment file.

## Authentication and Authorization

All protected requests use:

```http
Authorization: Bearer <jwt>
```

The backend middleware loads the user from the database on every request and attaches `{ id, role, name, isDemo }` to `req.user`, so role changes and deactivations take effect immediately.

### Admin

- View and manage all leads.
- Assign leads to active agents.
- Manage users and reset passwords.
- Delete leads.
- View organization-wide dashboard data.

### Agent

- Create leads assigned to themselves.
- View, update, and add notes to their own leads.
- View the user directory for assignment controls.
- Cannot delete leads or manage users.

The backend enforces ownership independently of frontend controls. For an agent, `GET /api/v1/leads` always adds the logged-in user ID as the `assignedAgent` filter.

### Demo accounts

Users flagged `isDemo` can work with leads but cannot perform any user-management write (create, update, delete, reset password) or change their own password. Demo accounts themselves cannot be deleted, demoted or deactivated, and the last active admin is always protected.

## API Reference

All API routes use the `/api/v1` prefix and return JSON objects with a `success` property unless noted otherwise. A `GET /health` endpoint (outside the prefix) is used for uptime monitoring.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/bootstrap` | Create the first admin using `x-bootstrap-key`. Rejected if an admin exists. |
| `POST` | `/auth/login` | Authenticate and receive a JWT. |
| `GET` | `/auth/me` | Return the current authenticated user. |
| `PUT` | `/auth/change-password` | Change the current password. |

### Leads

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/leads` | List leads with filtering, sorting, and pagination. |
| `POST` | `/leads` | Create a lead. |
| `GET` | `/leads/:id` | Get one lead with notes and activities. |
| `PUT` | `/leads/:id` | Update lead fields or status. |
| `DELETE` | `/leads/:id` | Delete a lead; admin only. |
| `POST` | `/leads/:id/notes` | Add a note to a lead. |
| `GET` | `/leads/export` | Export filtered leads as CSV. |
| `POST` | `/leads/import` | Import a CSV using multipart field `file`. |
| `GET` | `/leads/import/template` | Download the CSV import template. |

List and export query parameters:

| Parameter | Description | Default |
| --- | --- | --- |
| `page` | 1-indexed page number | `1` |
| `limit` | Results per page, maximum `100` | `10` |
| `search` | Case-insensitive search of name, phone, and email | none |
| `status` | Comma-separated statuses | none |
| `source` | Comma-separated lead sources | none |
| `assignedAgent` | Agent ObjectId; effective for admins | none |
| `sortBy` | `name`, `createdAt`, `followUpDate`, or `budget` | `createdAt` |
| `sortOrder` | `asc` or `desc` | `desc` |

Example:

```text
GET /api/v1/leads?page=1&limit=10&status=New,Contacted&sortBy=createdAt&sortOrder=desc
```

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/dashboard/stats` | Return cached dashboard metrics and distributions. |

### Users

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/users/directory` | Authenticated | Return active users for assignment dropdowns. |
| `GET` | `/users` | Admin | List all users. |
| `POST` | `/users` | Admin | Create an agent or admin. |
| `PUT` | `/users/:id` | Admin | Update user details or active status. |
| `POST` | `/users/:id/reset-password` | Admin | Set a temporary password. |
| `DELETE` | `/users/:id` | Admin | Delete a user. |

User write endpoints are rejected for demo accounts.

## Data Model

### Lead

Leads contain contact details, budget and property requirements, source, lifecycle status, an optional follow-up date, an `assignedAgent` reference to `User`, embedded notes, and an embedded activity timeline.

Supported property types: `1BHK`, `2BHK`, `3BHK`, `Plot`, `Villa`, `Commercial`, `Other`.
Supported sources: `Facebook`, `Google`, `Referral`, `Walk-in`, `Website`, `Other`.

### User

Users contain a name, unique email, bcrypt-hashed password, role, active status, `mustChangePassword` flag, and `isDemo` flag. New users created by an admin must change their temporary password on first login.

## Project Structure

```text
.
├── docker-compose.yml
├── package.json
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── scripts/
│   │   ├── seed-admin.js
│   │   ├── seedDemo.js
│   │   └── seedDummyLeads.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       └── utils/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

## Useful Commands

From the repository root:

```bash
npm run install:all
npm run build
```

Backend:

```bash
cd backend
npm run dev
npm start
npm run seed:admin   # requires ADMIN_EMAIL and ADMIN_PASSWORD
npm run seed:leads
npm run lint
npm run format:check
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run format:check
```

### Resetting the demo data

`seedDemo.js` (re)creates the two demo accounts and reloads about 15 sample leads. It **deletes all existing leads** in the database it connects to, so only run it against a demo database. It does nothing unless `--confirm` is passed, and it never touches users other than the two demo accounts.

Set `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_AGENT_EMAIL` and `DEMO_AGENT_PASSWORD` in `backend/.env` (there are no defaults), then:

```bash
cd backend
node scripts/seedDemo.js            # dry run: prints what it would do
node scripts/seedDemo.js --confirm  # applies the changes
```

## Deployment Notes

The production deployment runs on Render with MongoDB Atlas and Upstash Redis. The Docker frontend image is served by Nginx, and its `/api/` location proxies to the backend URL configured in `frontend/nginx.conf`; update that upstream when deploying to a different backend. MongoDB data in Docker is persisted in the `mongo_data` volume.

Free-tier services sleep after inactivity, so an uptime monitor pings `/health` every few minutes to keep the backend awake.

For production deployments:

- Set a long, random `JWT_SECRET`.
- Set a long, random `ADMIN_BOOTSTRAP_KEY`. After the first admin exists, the bootstrap endpoint rejects all requests.
- Set `CORS_ORIGIN` to the actual frontend origin.
- Use managed MongoDB and Redis, or persistent production volumes.
- Never commit `.env` files or default credentials.

## License

This project is provided as-is for educational and internal use.