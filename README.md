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

Create the tables with [`db-schema.sql`](db-schema.sql) (see [Database schema](#database-schema)) before sending requests. The terminal prints the listening URL, by default `http://localhost:3000`.

Each request is logged as `METHOD /url STATUS - Nms`. Editing a TypeScript file restarts the development server. After editing `.env`, restart it manually. Stop it with Ctrl+C.

## Configuration

All variables are read from `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `3000`; must be an integer from 1 to 65535. |
| `DATABASE_URI` | **Yes** | PostgreSQL connection string. The server refuses to start without it. |
| `JWT_SECRET` | **Yes** | Secret used to sign and verify tokens (HS256). Without it, login and protected routes fail. |

**Supabase:** copy the PostgreSQL URI from **Connect → Session pooler** (port 5432). Replace the password placeholder with your database password, percent-encoding any reserved characters.

**JWT secret:** generate one locally and never reuse the placeholder:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `.env`, `node_modules/` and `dist/` out of version control and submissions. The `.gitignore` already covers them.

## Database schema

The tables are defined in [`db-schema.sql`](db-schema.sql). Run that file once before starting the API, for example by pasting it into the Supabase SQL editor. It creates two tables:

- `users`: `id`, `username` (unique), `password` (bcrypt hash), `role` (`visitor` by default) and `created_at`.
- `lost_objects`: `id`, `name`, `description`, `location`, `status` and `created_at`.

Sign-up always creates a `visitor`, because `role` is not sent on insert. To create an admin, sign up normally and then promote the user:

```sql
update users set role = 'admin' where username = 'your-username';
```

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

Errors: `400` if a field is missing or is not a non-empty string, `409` if the username already exists.

### `POST /auth/login`

```json
{ "username": "alice", "password": "secret" }
```

Returns `200` with `{ "token": "<jwt>" }`. The token payload holds `sub` (the user id), `username` and `role`. Errors: `400` missing fields or fields that are not non-empty strings, `401` invalid username or password. An unknown user and a wrong password get the same response, so callers cannot tell which usernames exist.

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

### `GET /lost-objects/:id`

Returns `200` and one lost object, with the same fields as in the list above. Errors: `400` if `:id` is not a UUID, `404` if no lost object has that id.

### `POST /lost-objects`

```json
{
  "name": "Umbrella",
  "description": "Black umbrella",
  "location": "Library, 2nd floor",
  "status": "stored"
}
```

`name`, `description` and `location` are required and must be non-empty strings. `status` is optional. It can be `stored` (the default) or `returned`. Returns `201` and the created object, or `400` on invalid input.

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

`name`, `description` and `location` must be non-empty strings, and `status` must be `stored` or `returned`. Any `id` in the body is ignored. Returns `200` and the updated object. Errors: `400` if `:id` is not a UUID or the body is invalid, `404` if no lost object has that id.

### `DELETE /lost-objects/:id`

Returns `204` with no body. Errors: `400` if `:id` is not a UUID, `404` if no lost object has that id.

### Authentication errors

| Status | Cause |
| --- | --- |
| `401` | Missing header, malformed header (not `Bearer <token>`), or an invalid or expired token |
| `403` | Valid token, but the role is not allowed on this route |

A malformed JSON body returns `400` with `{ "error": "<message>" }`. Unhandled errors return `500` with the same shape.

### Example with curl

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
src/
  index.ts                 # Composition root: builds repositories, services, controllers; starts the server
  create-app.ts            # Express app: JSON parser, logging, routes, error handler
  routes/                  # Route definitions and the auth middleware applied to each route
  middlewares/
    auth.middleware.ts     # Bearer token check + role guards (admin, visitor, visitor-or-admin)
    log.middleware.ts      # Request logging with response time
    error.middleware.ts    # Catches unhandled errors and returns 500
  utils/
    db.ts                  # pg-promise connection (singleton)
    jwt.ts                 # Token creation and verification with jose
  contexts/
    shared/                # Generic Repository<T> contract
    users/                 # User entity, service, controller, Postgres repository
    lost-objects/          # LostObject entity, service, controller, Postgres repository
```

Requests pass through these layers: **route → middleware → controller** (validates the HTTP input) **→ service → repository** (runs SQL). Dependencies are injected through constructors in `index.ts`. To swap the storage, implement the repository contract with another class.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run with file watching and load `.env` |
| `npm run check` | Type-check without emitting files |
| `npm run build` | Compile `src/` into `dist/` |
| `npm start` | Run the compiled `dist/index.js` and load `.env` |

Run `npm run build` before `npm start`. Stop the development server first so both don't try to use the same port.
