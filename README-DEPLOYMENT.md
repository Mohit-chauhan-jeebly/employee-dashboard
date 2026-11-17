# Jeebly Employee Dashboard - setup

## Local backend
1. Install Node.js.
2. In this folder run `npm install`.
3. Run `npm start`. API: `http://localhost:3000/employees`; health: `/health`.
4. Open `index.html` with a local static server (VS Code Live Server recommended).

## Deploy backend
Deploy this folder to a Node.js host that supports persistent disk/storage. Set start command to `npm start`. The included JSON-file database is suitable for a demo only; on ephemeral hosting the file may reset and multiple instances are unsafe. For reliable production, use a hosted database.

## Connect frontend
Edit `config.js` and set `window.JEEBLY_API_BASE = "https://YOUR-API-HOST";` (no trailing slash). Then redeploy the frontend to Netlify. Do not leave localhost in a public deployment.

## Security / data
Use dummy employee data only in public demos. Do not publish real names, emails, phone numbers, credentials, or private company records. Configure CORS to restrict your deployed frontend origin before production.
