# Learn With ED Science License Admin

This project includes a working local backend that supports the admin dashboard in `learn with ED Science/index.html`.

## Start the server

From the repo root:

```bash
npm start
```

By default the server runs on:

```text
http://localhost:3000
```

## Admin credentials

The backend expects an admin secret in the `X-Admin-Key` header.

Example:

```bash
curl -X POST http://localhost:3000/admin/create \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: admin-secret" \
  -d '{"count": 5, "prefix": "EDSCI"}'
```

You can override the key with an environment variable:

```bash
ADMIN_KEY=my-secret npm start
```

## Routes

- `POST /admin/create` — generate access codes
- `POST /admin/list` — list codes and their status
- `POST /admin/reset` — reset a code to available
- `POST /activate` — activate a code for a device
- `GET /health` — health check

The dashboard works by posting to these routes using the Worker URL field.
