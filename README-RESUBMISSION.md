# Jeebly Employee Dashboard – Resubmission Notes

## Main dashboard
- Open `index.html` to use the integrated Employee Dashboard.
- The Day 1–Day 5 learning pages are retained in their original folders.
- Main dashboard features: employee statistics, search, department/status/project-status filters, sorting, 10-record pagination with numbered page controls, View details modal, Add, Edit, Delete, API status, loading/empty/error states and Retry.

## Configure the live API before publishing
1. Open `config.js`.
2. Set `window.JEEBLY_API_BASE` to the deployed backend origin (no `/employees` suffix), for example:
   `window.JEEBLY_API_BASE = "https://your-deployed-api.example.com";`
3. Commit and push the changes, then wait for Netlify to finish deploying.
4. Test `https://your-deployed-api.example.com/health` and `/employees` in a browser.

For local development on `localhost` or `127.0.0.1`, an empty API base uses `http://localhost:3000` automatically.

## API routes used
- GET `/employees`
- POST `/employees`
- PUT `/employees/:id`
- DELETE `/employees/:id`

The server in this repository implements these routes and the `/health` endpoint. The live API still needs to be deployed and verified using the real deployed URL. Do not report live API testing as passed until it has actually been performed.

## Manual test checklist before Jira resubmission
- [ ] GET loads the employee list and all four statistics.
- [ ] Add creates a record (POST) and the list/statistics refresh.
- [ ] Edit updates a record (PUT) and the list refreshes.
- [ ] Delete removes a record (DELETE) and pagination adjusts correctly.
- [ ] Search, all filters, sorting and numbered pagination work together.
- [ ] View modal displays employee fields and each assigned project/status.
- [ ] Empty API response shows an empty state.
- [ ] API failure shows an error and Retry control.
- [ ] Verify at desktop, tablet and mobile widths.
- [ ] Verify the deployed Netlify site against the deployed backend.

## Notes
- Active Projects counts project records whose status is `In Progress`.
- Unassigned Employees counts employees with an empty/missing `projects` array.
- In the Add/Edit form, comma-separated project names are saved as project records with the selected project status.
