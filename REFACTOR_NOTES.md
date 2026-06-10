# Refactor Notes

## Completed

- Moved backend runtime entrypoint to `backend/src/server.js`.
- Moved the Express app body to `backend/src/app.js`.
- Kept `backend/server.js` as a compatibility wrapper.
- Updated backend scripts to check and run the new entrypoint.
- Moved frontend API and Supabase clients into `frontend/src/lib/`.
- Kept old frontend API/Supabase files as re-export wrappers.
- Moved shared frontend constants into `frontend/src/constants/`.
- Moved formatting and calculation helpers into `frontend/src/utils/`.
- Moved small reusable UI components into `frontend/src/components/ui/`.
- Added frontend and backend `.env.example` files.
- Added `docs/architecture.md`.

## Intentionally Preserved

- API endpoint paths and payload shapes.
- Prisma schema semantics.
- Supabase authentication behavior.
- Role permissions.
- Work-order, stock depletion and image upload behavior.
- Existing visual style and tab navigation.

## Recommended Next Steps

- Split `backend/src/app.js` into domain route/controller/service files.
- Split `frontend/src/App.jsx` feature screens into `features/` folders.
- Split `frontend/src/styles.css` into focused CSS files.
- Add Prettier once dependency installation is available.
