<p align="center">
  <img src="docs/banner.svg" alt="Universidad San Jorge · Escuela de Arquitectura y Tecnología" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.18-5FA04E?logo=nodedotjs&logoColor=white" alt="Node.js >= 22.18">
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" alt="TypeScript 7">
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5">
</p>

# Lost and Found API

A REST API for registering and listing objects found on campus. It is built with Node.js, TypeScript and Express, stores its data in PostgreSQL (for example Supabase), and uses JWT authentication with two roles: `visitor` and `admin`.

- **Visitors** and **admins** can list and view lost objects.
- Only **admins** can register, replace and delete lost objects.

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Database schema](#database-schema)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Scripts](#scripts)

## Requirements

- Node.js **22.18 or later** and npm
- A PostgreSQL database (a free Supabase project works)

## Quick start

```sh
npm ci
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
# edit .env: set DATABASE_URI and JWT_SECRET
npm run check
npm run dev
```

> [!IMPORTANT]
> Create the tables with [`db-schema.sql`](db-schema.sql) (see [Database schema](#database-schema)) before sending requests. Otherwise every request that touches the database fails with `500`.

The terminal prints the listening URL, by default `http://localhost:3000`. Each request is logged as `METHOD /url STATUS - Nms`. Stop the server with Ctrl+C.

> [!NOTE]
> Editing a TypeScript file restarts the development server automatically. Editing `.env` does not: restart it manually.

## Configuration

All variables are read from `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `3000`; must be an integer from 1 to 65535. |
| `DATABASE_URI` | **Yes** | PostgreSQL connection string. The server refuses to start without it. |
| `JWT_SECRET` | **Yes** | Secret used to sign and verify tokens (HS256). Without it, login and protected routes fail. |

**Supabase:** copy the PostgreSQL URI from **Connect → Session pooler** (port 5432) and replace the password placeholder with your database password.

> [!TIP]
> If your database password contains reserved characters such as `@`, `#`, `/` or `:`, percent-encode them in the URI (for example `@` becomes `%40`). Otherwise the connection fails with an authentication or host error.

**JWT secret:** generate one locally and never reuse the placeholder:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

> [!CAUTION]
> `.env` holds your database password and JWT secret. Never commit it, share it or include it in a submission (including `.zip` files). The `.gitignore` already excludes `.env`, `node_modules/` and `dist/`.

## Database schema

The tables are defined in [`db-schema.sql`](db-schema.sql). Run that file once before starting the API, for example by pasting it into the Supabase SQL editor. It creates two tables:

- `users`: `id`, `username` (unique), `password` (bcrypt hash), `role` (`visitor` by default) and `created_at`.
- `lost_objects`: `id`, `name`, `description`, `location`, `status` and `created_at`.

Sign-up always creates a `visitor`, because `role` is not sent on insert. To create an admin, sign up normally and then promote the user:

```sql
update users set role = 'admin' where username = 'your-username';
```

> [!WARNING]
> The role is stored inside the JWT. After promoting a user, **log in again** to get a new token. An older token still says `visitor` until it expires, and admin routes return `403`.

## API reference

Every request and response body is JSON. Protected routes need the header:

```http
Authorization: Bearer <token>
```

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Create a visitor account |
| `POST` | `/auth/login` | Public | Get a JWT valid for 15 minutes |
| `GET` | `/lost-objects` | Visitor or admin | List all lost objects |
| `GET` | `/lost-objects/:id` | Visitor or admin | Get one lost object |
| `POST` | `/lost-objects` | Admin | Register a lost object |
| `PUT` | `/lost-objects/:id` | Admin | Replace a lost object |
| `DELETE` | `/lost-objects/:id` | Admin | Delete a lost object |

### `POST /auth/signup`

```json
{ "username": "alice", "password": "secret" }
```

Returns `201` and the created user. The password hash is never returned:

```json
{
  "id": "3b9a…",
  "username": "alice",
  "role": "visitor",
  "created_at": "2026-11-03T10:00:00.000Z"
}
```

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Username and password are required" }` | `username` or `password` is missing or empty |
| `409` | `{ "message": "Username already exists" }` | Another user already has that username |

### `POST /auth/login`

```json
{ "username": "alice", "password": "secret" }
```

Returns `200` with `{ "token": "<jwt>" }`. The token payload holds `sub` (the user id), `username` and `role`.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Username and password are required" }` | `username` or `password` is missing or empty |
| `401` | `{ "message": "Invalid username or password" }` | Unknown user or wrong password |

An unknown user and a wrong password get the same response, so callers cannot tell which usernames exist.

### `GET /lost-objects`

Returns `200` and an array of lost objects:

```json
[
  {
    "id": "6f1c…",
    "name": "Umbrella",
    "description": "Black umbrella",
    "location": "Library, 2nd floor",
    "status": "stored",
    "created_at": "2026-11-03T10:15:00.000Z"
  }
]
```

No errors besides the [authentication errors](#authentication-errors).

### `GET /lost-objects/:id`

Returns `200` and one lost object, with the same fields as in the list above.

| Status | Body | Cause |
| --- | --- | --- |
| `404` | `{ "message": "Lost object not found" }` | No lost object has that id |
| `500` | `{ "error": "<message>" }` | `:id` is not a valid UUID, so PostgreSQL rejects the query |

### `POST /lost-objects`

```json
{
  "name": "Umbrella",
  "description": "Black umbrella",
  "location": "Library, 2nd floor",
  "status": "stored"
}
```

`name`, `description` and `location` are required. `status` is optional. It can be `stored` (the default) or `returned`. Returns `201` and the created object.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Name, description, and location are required" }` | `name`, `description` or `location` is missing or empty |
| `400` | `{ "message": "Status must be 'returned' or 'stored'" }` | `status` has any other value |

### `PUT /lost-objects/:id`

Replaces the whole object, so every field is required:

```json
{
  "name": "Umbrella",
  "description": "Black umbrella",
  "location": "Lost and found office",
  "status": "returned"
}
```

Any `id` in the body is ignored. Returns `200` and the updated object.

> [!WARNING]
> `status` should be `stored` or `returned`, but this route does not check the value, and the table has no constraint either. Any other text is saved as is.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Name, description, location, and status are required" }` | A field is missing or empty |
| `404` | `{ "message": "Lost object not found" }` | No lost object has that id |
| `500` | `{ "error": "<message>" }` | `:id` is not a valid UUID, so PostgreSQL rejects the query |

### `DELETE /lost-objects/:id`

Returns `204` with no body.

| Status | Body | Cause |
| --- | --- | --- |
| `404` | `{ "message": "Lost object not found" }` | No lost object has that id |
| `500` | `{ "error": "<message>" }` | `:id` is not a valid UUID, so PostgreSQL rejects the query |

### Authentication errors

Every `/lost-objects` route can also return:

| Status | Body | Cause |
| --- | --- | --- |
| `401` | `{ "message": "Authorization header missing" }` | No `Authorization` header |
| `401` | `{ "message": "Invalid authorization header format" }` | The header is not `Bearer <token>` |
| `401` | `{ "message": "Invalid token", "error": "<reason>" }` | The token is invalid or has expired |
| `403` | `{ "message": "Forbidden: Insufficient role" }` | Valid token, but the role is not allowed on this route |

### General errors

These can happen on any route:

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "error": "<message>" }` | The request body is not valid JSON |
| `500` | `{ "error": "<message>" }` | Unexpected server error, for example the database is unreachable or a field is not a string |

> [!NOTE]
> Errors detected by the API itself use `message`. Errors caught by the error handler use `error`.

### Example with curl

> [!NOTE]
> These commands use bash syntax (macOS, Linux, Git Bash or WSL). In PowerShell, `curl` is an alias for `Invoke-WebRequest` and `TOKEN=$(...)` does not work.

```sh
# Sign up and log in
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret"}'

TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# List lost objects
curl http://localhost:3000/lost-objects -H "Authorization: Bearer $TOKEN"
```

## Project structure

The code is organised by **bounded context**. Each context is split into `domain`, `application` and `infrastructure` layers:

```text
db-schema.sql                         # Tables to create before starting the API
src/
  index.ts                            # Composition root: builds repositories, services, controllers; starts the server
  create-app.ts                       # Express app: JSON parser, logging, routes, error handler
  routes/
    auth.routes.ts                    # /auth/signup, /auth/login
    lost-object.routes.ts             # /lost-objects CRUD and the role guard of each route
  middlewares/
    auth.middleware.ts                # Bearer token check + role guards (admin, visitor, visitor-or-admin)
    log.middleware.ts                 # Request logging with response time
    error.middleware.ts               # Unhandled errors: keeps 4xx statuses (e.g. malformed JSON), otherwise 500
  utils/
    db.ts                             # pg-promise connection (singleton)
    jwt.ts                            # Token creation and verification with jose
  contexts/
    shared/
      infrastructure/
        repository.contract.ts        # Generic Repository<T> contract
    users/
      domain/
        user.entity.ts                # User and PublicUser (without password) types
      application/
        users.controller.ts           # Signup and login: validates input, hashes passwords, issues JWTs
        users.service.ts
      infrastructure/
        users-repository.contract.ts  # UsersRepository contract
        users.postgres.repository.ts  # SQL queries for users
    lost-objects/
      domain/
        lost-object.entity.ts         # LostObject type
      application/
        lost-object.controller.ts     # Validates input and maps results to HTTP responses
        lost-object.service.ts
      infrastructure/
        lost-object.postgres.repository.ts  # SQL queries for lost objects
```

Requests pass through these layers: **route → middleware → controller** (validates the HTTP input) **→ service → repository** (runs SQL). Dependencies are injected through constructors in `index.ts`. To swap the storage, implement the repository contract with another class.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run with file watching and load `.env` |
| `npm run check` | Type-check without emitting files |
| `npm run build` | Compile `src/` into `dist/` |
| `npm start` | Run the compiled `dist/index.js` and load `.env` |

> [!TIP]
> Run `npm run build` before `npm start`, and stop the development server first so both don't try to use the same port.
