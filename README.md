# Moviz Frontend

This repository contains the React web frontend for the Moviz movie application. It currently includes:

- A **Login** page (`/login`)
- A **Signup** page (`/signup`)
- A **Home** page (`/`), intended to list movies

Forms and API helpers are prepared for integration with a FastAPI backend. The data layer lives in `src/api.js` and expects a `REACT_APP_API_URL` environment variable to point to the server.

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app. Routes are handled client‑side via `react-router-dom`.

## Development notes

- Authentication state is currently not persisted; tokens may be stored in `localStorage` or a context provider in future iterations.
- Stubbed API functions (`login`, `signup`, `fetchMovies`) should be replaced with real endpoints once the backend is available.
- Add route guards for protected pages when auth is implemented.
- Styling is minimal and should be extended using a design system or CSS framework.

## Available scripts

- `npm start` – start development server
- `npm run build` – create production build
- `npm test` – run tests (not configured yet)
- `npm run eject` – eject CRA configuration (usually not needed)

## Next steps

1. Build the FastAPI backend with real authentication and movie endpoints.
2. Wire up frontend API calls and handle success/failure states.
3. Add user context and access control.
4. Improve UI/UX for desktop and mobile.
