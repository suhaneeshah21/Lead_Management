# Real Estate Lead Management CRM

A full-stack lead management CRM for real estate teams. The application supports authenticated admin and agent workflows, agent-based lead ownership, lead lifecycle tracking, dashboard analytics, CSV import/export, and containerized deployment with MongoDB and Redis.

## Features

- JWT authentication with protected routes and forced password changes.
- Role-based access for `admin` and `agent` users.
- Lead creation, editing, viewing, notes, follow-up dates, and activity history.
- Lead statuses: `New`, `Contacted`, `Site Visit`, and `Closed`.
- Search across lead name, phone, and email with status, source, pagination, and sorting filters.
- Automatic lead scoping: agents can only list and manage leads assigned to their own user ID; admins can view all leads.
- Admin user management, including agent creation, activation/deactivation, password reset, and deletion.
- Dashboard metrics for lead counts, conversion, status/source distribution, budgets, and follow-ups.
- CSV import with validation feedback, downloadable import template, and CSV export.
- Redis caching for dashboard data with a MongoDB fallback when Redis is unavailable.
- Request validation, rate limiting, security headers, compression, structured logging, and centralized errors.
- Docker Compose setup for MongoDB, Redis, backend, and frontend services.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, React Router 6, Axios, Recharts, Vite |
| Backend | Node.js 18+, Express, Mongoose, JWT, bcryptjs |
| Database | MongoDB 6 |
| Cache | Redis 7 |
| Security | Helmet, CORS, express-validator, express-rate-limit |
| Operations | Docker, Docker Compose, Winston, Morgan, Nginx |

## Quick Start With Docker

### Prerequisites

- Docker Desktop with Docker Compose
- Ports `3002` and the internal service ports available

### Start the application

```bash
docker compose up --build -d
```

Open the frontend at [http://localhost:3002](http://localhost:3002).

The Compose backend listens on port `5000` inside the Docker network. It is not currently published directly to the host; API requests from the containerized frontend follow the upstream configured in `frontend/nginx.conf`.

For a direct local health check, publish the backend port in `docker-compose.yml` or run the backend outside Docker. The health endpoint is:

```text
http://localhost:5000/health
```

The Compose backend is configured with MongoDB at `mongodb:27017` and Redis at `redis:6379`. Set `FRONTEND_PORT` to change the frontend host port:

```bash
FRONTEND_PORT=3005 docker compose up --build -d
```

### Create the first admin

The bootstrap endpoint requires the `x-bootstrap-key` header:

```bash
curl -X POST http://localhost:5000/api/v1/auth/bootstrap \
	-H "Content-Type: application/json" \
	-H "x-bootstrap-key: change-me" \
	-d '{"name":"CRM Admin","email":"admin@example.com","password":"Admin1234!"}'
```

For repeatable local or container setup, the backend also includes an admin seed script:

```bash
docker compose exec backend npm run seed:admin
docker compose exec backend npm run seed:leads
```

The lead seed uses the first active agent it finds, or the admin if no agent exists.

Stop the stack with:

```bash
docker compose down
```

Add `-v` only when you intentionally want to remove the persisted MongoDB volume.

## Local Development

### Requirements

- Node.js 18 or newer
- MongoDB 6 or a compatible MongoDB deployment
- Redis 7 or a compatible Redis deployment

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

For local development, configure the backend environment before starting it. The frontend API client uses `/api/v1` by default; set `VITE_API_URL` when the API is hosted at a different origin.

## Environment Variables

Create `backend/.env` for local development:

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/realestatecrm
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
ADMIN_BOOTSTRAP_KEY=change-me

# Optional seed-admin overrides
ADMIN_NAME=CRM Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin1234!
```

Frontend configuration is provided through Vite:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```

Do not use development secrets in production. The Docker Compose file supplies service-to-service URLs and supports overriding `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `ADMIN_BOOTSTRAP_KEY`, and `FRONTEND_PORT` through the shell or an environment file.

## Authentication and Authorization

All protected requests use:

```http
Authorization: Bearer <jwt>
```

The authenticated user is loaded by the backend middleware and represented as `{ id, role, name }` on `req.user`.

### Admin

- View and manage all leads.
- Assign leads to active agents.
- Manage users and reset passwords.
- Delete leads.
- View organization-wide dashboard data.

### Agent

- Create leads assigned to themselves.
- View, update, and add notes to their own leads.
- View the authenticated user directory for assignment controls.
- Cannot delete leads or manage users.

The backend enforces ownership independently of frontend controls. For an agent, `GET /api/v1/leads` always adds the logged-in user ID as the `assignedAgent` MongoDB filter.

## API Reference

All API routes use the `/api/v1` prefix and return JSON objects with a `success` property unless noted otherwise.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/bootstrap` | Create the first admin using `x-bootstrap-key`. |
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

List and export query parameters include:

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
| --- | --- | --- |
| `GET` | `/users/directory` | Authenticated | Return active users for assignment dropdowns. |
| `GET` | `/users` | Admin | List all users. |
| `POST` | `/users` | Admin | Create an agent or admin. |
| `PUT` | `/users/:id` | Admin | Update user details or active status. |
| `POST` | `/users/:id/reset-password` | Admin | Set a temporary password. |
| `DELETE` | `/users/:id` | Admin | Delete a user. |

## Data Model

### Lead

Leads contain contact details, budget and property requirements, source, lifecycle status, optional follow-up date, an `assignedAgent` reference to `User`, embedded notes, and an embedded activity timeline.

Supported property types are `1BHK`, `2BHK`, `3BHK`, `Plot`, `Villa`, `Commercial`, and `Other`. Supported sources are `Facebook`, `Google`, `Referral`, `Walk-in`, `Website`, and `Other`.

### User

Users contain a name, unique email, bcrypt-hashed password, role, active status, and `mustChangePassword` flag. New users created by an admin are required to change their temporary password on first login.

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

The frontend uses React Router for navigation, React Context for authentication state, Axios for API requests, and page-level components for dashboard, leads, users, and account workflows.

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

Backend commands:

```bash
cd backend
npm run dev
npm start
npm run seed:admin
npm run seed:leads
npm run lint
npm run format:check
```

Frontend commands:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run format:check
```

## Deployment Notes

The frontend production image is served by Nginx. Its `/api/` location proxies to the backend URL configured in `frontend/nginx.conf`; update that upstream before deploying to a different backend. MongoDB data is persisted in the `mongo_data` Docker volume.

For production deployments:

- Set a long, random `JWT_SECRET`.
- Replace `ADMIN_BOOTSTRAP_KEY` and remove or restrict bootstrap access after creating the first admin.
- Set `CORS_ORIGIN` to the actual frontend origin.
- Use managed MongoDB and Redis or persistent production volumes.
- Avoid committing `.env` files or default credentials.

## License

This project is provided as-is for educational and internal use.
