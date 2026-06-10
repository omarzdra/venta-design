# Venta Design Architecture

Venta Design is split into a React/Vite frontend and an Express/Prisma backend.

## Frontend

- `frontend/src/main.jsx` mounts the app and imports global styles.
- `frontend/src/App.jsx` still coordinates the current tab-based application shell and feature screens.
- `frontend/src/lib/` contains external clients and API access.
- `frontend/src/constants/` contains shared app constants.
- `frontend/src/utils/` contains formatting, calculations and draft storage helpers.
- `frontend/src/components/ui/` contains small reusable UI primitives.
- `frontend/src/styles/index.css` is the global style entrypoint.

The current navigation is state-based tabs. Endpoint names and payload shapes are preserved.

## Backend

- `backend/src/server.js` is the runtime entrypoint and only starts the HTTP server.
- `backend/src/app.js` contains the Express app, middleware and routes.
- `backend/server.js` remains as a compatibility wrapper for older commands.
- Prisma schema and migrations remain in `backend/prisma/`.

Further backend cleanup should split `src/app.js` by domain routes and services without changing endpoint paths.

## Main Flows

- Supabase handles authentication.
- Role-based navigation is enforced in the frontend and protected again by backend route permissions.
- Work orders deplete stock through backend transactional logic.
- Work-order images are compressed on the client and uploaded through the backend to Supabase Storage.
