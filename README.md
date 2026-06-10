# Venta Design

Internal business app for Venta Design inventory, work orders, services, offers and analytics.

## Tech Stack

- Frontend: React, Vite, Supabase Auth
- Backend: Express, Prisma, PostgreSQL
- Storage: Supabase Storage
- Deployment: Vercel or similar for frontend, Railway for backend

## Local Setup

Install dependencies:

```bash
cd frontend
npm install

cd ../backend
npm install
```

Create environment files from examples:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Run Prisma migrations locally:

```bash
cd backend
npx prisma migrate dev
```

Start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

## Checks

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
npm run check
```

## Environment Variables

Frontend variables are documented in `frontend/.env.example`.

Backend variables are documented in `backend/.env.example`.

Do not commit real `.env` files or service role keys.

## Deployment Notes

- Set `VITE_API_URL` on the frontend to the deployed backend URL.
- Set `CORS_ORIGINS` on the backend to the deployed frontend origin.
- Run `npx prisma migrate deploy` on production after migrations are added.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only on the backend.
- Configure the `naloga-slike` Supabase Storage bucket before image upload is used.

## Architecture

See `docs/architecture.md` and `REFACTOR_NOTES.md`.
