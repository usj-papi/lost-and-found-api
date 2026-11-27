<p align="center">
  <img src="docs/banner.svg" alt="Universidad San Jorge · Escuela de Arquitectura y Tecnología" width="100%">
</p>

# Lost and Found API

<p>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.18-5FA04E?logo=nodedotjs&logoColor=white" alt="Node.js >= 22.18">
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" alt="TypeScript 7">
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5">
</p>

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

**Supabase:** copy the PostgreSQL URI from **Connect → Transaction pooler** (port 6543, recommended for serverless deployments such as Vercel) and replace the password placeholder with your database password.

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

- `users`: `id`, `username` (unique), `name`, `email` (unique, case-insensitive), `password` (bcrypt hash), `role` (`visitor` by default), `refresh_token_hash` and `refresh_token_expires_at` (the current session, see [`POST /auth/refresh`](#post-authrefresh)) and `created_at`. `email` is nullable only for accounts created before it was collected.
- `lost_objects`: `id`, `name`, `description`, `location`, `status` and `created_at`.

If your database was created before `name` and `email` existed, run [`migrations/001_add_user_name_email.sql`](migrations/001_add_user_name_email.sql) once in the Supabase SQL editor. It backfills `name` with the username and leaves `email` empty for existing users. Then run [`migrations/002_add_user_refresh_token.sql`](migrations/002_add_user_refresh_token.sql), which adds the refresh token columns.

Sign-up always creates a `visitor`, because `role` is not sent on insert. To create an admin, sign up normally and then promote the user:

```sql
update users set role = 'admin' where username = 'your-username';
```

> [!WARNING]
> The role is stored inside the JWT. After promoting a user, their current JWT still says `visitor`, and admin routes return `403`, until they call `/auth/refresh` (at most 15 minutes later, when the JWT expires) or log in again.

## API reference

Every request and response body is JSON. Protected routes need the header:

```http
Authorization: Bearer <token>
```

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Create a visitor account |
| `POST` | `/auth/login` | Public | Get a JWT valid for 15 minutes and a refresh token |
| `POST` | `/auth/refresh` | Public (refresh token) | Exchange a refresh token for a new JWT and refresh token |
| `POST` | `/auth/logout` | Public (refresh token) | Revoke a refresh token |
| `GET` | `/lost-objects` | Visitor or admin | List all lost objects |
| `GET` | `/lost-objects/:id` | Visitor or admin | Get one lost object |
| `POST` | `/lost-objects` | Admin | Register a lost object |
| `PUT` | `/lost-objects/:id` | Admin | Replace a lost object |
| `DELETE` | `/lost-objects/:id` | Admin | Delete a lost object |
| `GET` | `/users` | Admin | List all users |
| `GET` | `/users/:id` | Admin | Get one user |
| `POST` | `/users` | Admin | Create a user with any role |
| `PATCH` | `/users/:id` | Admin | Update some fields of a user |

### `POST /auth/signup`

```json
{
  "username": "alice",
  "password": "secret",
  "name": "Alice Smith",
  "email": "alice@example.com"
}
```

All four fields are required. `name` is trimmed and `email` is trimmed and lowercased before saving.

Returns `201` and the created user. The password hash is never returned:

```json
{
  "id": "3b9a…",
  "username": "alice",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "visitor",
  "created_at": "2026-11-03T10:00:00.000Z"
}
```

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Username, password, name and email are required" }` | A field is missing or empty |
| `400` | `{ "message": "Name and email must be strings" }` | `name` or `email` is not a string, or `name` is only whitespace |
| `400` | `{ "message": "Invalid email" }` | `email` does not look like an address |
| `409` | `{ "message": "Username already exists" }` | Another user already has that username |
| `409` | `{ "message": "Email already exists" }` | Another user already has that email |

### `POST /auth/login`

```json
{ "username": "alice", "password": "secret" }
```

Returns `200` with a JWT and a refresh token:

```json
{ "token": "<jwt>", "refreshToken": "<opaque>" }
```

The JWT payload holds `sub` (the user id), `username`, `name`, `email`, `role` and `createdAt` (ISO 8601), and expires after 15 minutes. It never includes the password or refresh token hashes. The refresh token is a random value valid for 7 days. Only its SHA-256 hash is stored in the database.

Each user has a single active session: a new login replaces the previous refresh token, so the old one stops working.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Username and password are required" }` | `username` or `password` is missing or empty |
| `401` | `{ "message": "Invalid username or password" }` | Unknown user or wrong password |

An unknown user and a wrong password get the same response, so callers cannot tell which usernames exist.

### `POST /auth/refresh`

No `Authorization` header is needed, so it works after the JWT has expired:

```json
{ "refreshToken": "<opaque>" }
```

Returns `200` with a new `{ "token", "refreshToken" }`, like login. The new JWT is built from the database, so it carries the user's **current** username and role.

The refresh token is single use: each refresh replaces it, and the old one is rejected from then on. Store the refresh token securely on the client, never in logs or URLs, and replace it with the new one after every refresh.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Refresh token is required" }` | `refreshToken` is missing, empty or not a string |
| `401` | `{ "message": "Invalid or expired refresh token" }` | Unknown token, older than 7 days, already used, or replaced by a newer login |

### `POST /auth/logout`

```json
{ "refreshToken": "<opaque>" }
```

Revokes the refresh token and returns `204`, whether or not the token was valid. JWTs already issued keep working until they expire, at most 15 minutes later.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Refresh token is required" }` | `refreshToken` is missing, empty or not a string |

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

### `GET /users`

Returns `200` and an array of users, oldest first. Password hashes are never returned:

```json
[
  {
    "id": "3b9a…",
    "username": "alice",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "role": "visitor",
    "created_at": "2026-11-03T10:00:00.000Z"
  }
]
```

### `GET /users/:id`

Returns `200` and one user, in the same shape as in `GET /users`.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Invalid id" }` | `:id` is not a valid UUID |
| `404` | `{ "message": "User not found" }` | No user has that id |

### `POST /users`

Same body as `POST /auth/signup`, plus an optional `role` (`visitor` by default):

```json
{
  "username": "bob",
  "password": "secret",
  "name": "Bob Jones",
  "email": "bob@example.com",
  "role": "admin"
}
```

Returns `201` and the created user. It gives the same `400` and `409` errors as `POST /auth/signup`, plus:

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Role must be 'visitor' or 'admin'" }` | `role` has any other value |

### `PATCH /users/:id`

Send only the fields to change. Any of `username`, `password`, `name`, `email` and `role` is accepted, and other fields are ignored:

```json
{ "name": "Alice Brown", "role": "admin" }
```

Returns `200` and the updated user. A new password is hashed before saving. `username`, `name` and `email` are trimmed, and `email` is also lowercased.

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "message": "Invalid id" }` | `:id` is not a valid UUID |
| `400` | `{ "message": "At least one field is required" }` | None of the accepted fields was sent |
| `400` | `{ "message": "<field> must be a non-empty string" }` | A field is not a string, or is empty |
| `400` | `{ "message": "Invalid email" }` | `email` does not look like an address |
| `400` | `{ "message": "Role must be 'visitor' or 'admin'" }` | `role` has any other value |
| `400` | `{ "message": "You cannot change your own role" }` | The admin tried to change their own role, which could lock them out |
| `404` | `{ "message": "User not found" }` | No user has that id |
| `409` | `{ "message": "Username already exists" }` | Another user already has that username |
| `409` | `{ "message": "Email already exists" }` | Another user already has that email |

> [!WARNING]
> JWTs already issued are not updated when a user changes. After a username or role change, the user's current JWT keeps the old values until it expires. The change applies on their next `/auth/refresh` (at most 15 minutes later) or login. A **password** change also ends the user's session: their refresh token is revoked, so they must log in again once their JWT expires.

### Authentication errors

Every `/lost-objects` and `/users` route can also return:

| Status | Body | Cause |
| --- | --- | --- |
| `401` | `{ "message": "Authorization header missing" }` | No `Authorization` header |
| `401` | `{ "message": "Invalid authorization header format" }` | The header is not `Bearer <token>` |
| `401` | `{ "message": "Token expired", "code": "TOKEN_EXPIRED" }` | The token has expired. Call `POST /auth/refresh` and retry the request |
| `401` | `{ "message": "Invalid token", "error": "<reason>" }` | The token is invalid (bad signature, malformed…). Log in again |
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
  -d '{"username":"alice","password":"secret","name":"Alice Smith","email":"alice@example.com"}'

LOGIN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret"}')
TOKEN=$(echo "$LOGIN" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
REFRESH=$(echo "$LOGIN" | node -pe 'JSON.parse(require("fs").readFileSync(0)).refreshToken')

# List lost objects
curl http://localhost:3000/lost-objects -H "Authorization: Bearer $TOKEN"

# Get a new JWT once it expires (the response also has a new refresh token)
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

## Project structure

The code is organised by **bounded context**. Each context is split into `domain`, `application` and `infrastructure` layers:

```text
db-schema.sql                         # Tables to create before starting the API
migrations/                           # SQL to upgrade an existing database, run in order (001, 002)
src/
  index.ts                            # Composition root: builds repositories, services, controllers; starts the server
  create-app.ts                       # Express app: JSON parser, logging, routes, error handler
  routes/
    auth.routes.ts                    # /auth/signup, /auth/login, /auth/refresh, /auth/logout
    lost-object.routes.ts             # /lost-objects CRUD and the role guard of each route
    users.routes.ts                   # /users list, get, create and update (admin only)
  middlewares/
    auth.middleware.ts                # Bearer token check + role guards (admin, visitor, visitor-or-admin)
    log.middleware.ts                 # Request logging with response time
    error.middleware.ts               # Unhandled errors: keeps 4xx statuses (e.g. malformed JSON), otherwise 500
  utils/
    db.ts                             # pg-promise connection (singleton)
    jwt.ts                            # Token creation and verification with jose
    refresh-token.ts                  # Random refresh tokens and their SHA-256 hashes
  contexts/
    shared/
      infrastructure/
        repository.contract.ts        # Generic Repository<T> contract
    users/
      domain/
        user.entity.ts                # User and PublicUser (without password) types
      application/
        users.controller.ts           # Signup, login and admin user management: validates input, hashes passwords, issues JWTs and refresh tokens
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

