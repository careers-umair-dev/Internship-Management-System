# Intern Progress Management System (MERN)

Full-stack platform to onboard interns, assign tasks, review submissions, give feedback and track performance.

> **Status: complete (Phases 1-6).** Admin and intern apps, REST API, global search, CSV/print reports, light/dark theme, responsive layout. Tested with 98 backend end-to-end checks and 112 frontend tests (94 mocked + 18 against the real API and database, including the full admin -> intern -> admin workflow and the revise-and-resubmit loop).

## Features
| Area | Highlights |
|------|-----------|
| Auth | JWT + bcrypt, Admin and Intern roles, intern self-registration, protected routes, auto sign-out on expired tokens |
| Admin | KPI dashboard with charts and date filters, interns CRUD + profiles, tasks (table + kanban), submission review (approve / revise / reject + rating), reports |
| Intern | Personal dashboard, my tasks (table + board), progress updates, submit work (text / link / files), submissions, feedback, progress report |
| Platform | Notifications + activity timeline, **global search (Ctrl+K or /)**, CSV export, printable reports, light / dark / system theme, mobile drawer navigation, error boundaries |

## Quick start (both apps)
```bash
# terminal 1 - API
cd backend && cp .env.example .env   # set MONGO_URI + JWT_SECRET
npm install && npm run seed && npm run dev

# terminal 2 - web app
cd frontend && cp .env.example .env
npm install && npm run dev            # http://localhost:5173
```
Sign in with the demo credentials below. In development Vite proxies `/api` and `/uploads` to the backend, so no CORS setup is needed.

## Global search
The top bar search finds interns (admin only) and tasks (admins: all; interns: their own). Press `Ctrl/Cmd + K` or `/` to focus it, arrow keys + Enter to open a result, Esc to close. Minimum 2 characters, results are debounced and grouped.

## Requirements
- Node.js 18+
- MongoDB 6+ (local or MongoDB Atlas)

## Setup (backend)
```bash
cd backend
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm install
npm run seed                # demo admin, interns, tasks
npm run dev                 # http://localhost:5000
```
Health check: `GET http://localhost:5000/api/health`

## Frontend (React + Vite + Tailwind)
| Command | Action |
|---------|--------|
| `npm run dev` | Dev server on :5173 |
| `npm run build` / `npm run preview` | Production build / preview |
| `npm test` | 94 unit + UI-flow tests (mocked API, no backend needed) |
| `E2E_API=1 VITE_API_URL=http://localhost:5000/api npm test` | also runs 18 tests against the real API (needs a freshly seeded DB (`npm run seed:reset`), backend started with `CLIENT_URL=http://localhost:3000`, and a high `LOGIN_RATE_LIMIT` such as 1000) |

Frontend env (`frontend/.env`): `VITE_API_URL` (empty in dev; full API URL in production, e.g. `https://api.example.com/api`) and `VITE_PROXY_TARGET` (dev proxy target, default `http://localhost:5000`). In production also add the web app's origin to the backend `CLIENT_URL`.

## Intern app pages
- **Dashboard** (`/intern/dashboard`): welcome card with progress ring, task stats, "Progress over time" chart, status donut, upcoming deadlines (click to open), recent feedback, recent submissions, overdue shortcut.
- **My tasks** (`/intern/tasks`, `/intern/tasks/:id`): table and board views with search, status / priority / category / deadline filters, overdue-only toggle, sorting, pagination (filters live in the URL) and CSV export; update progress (0-99%) from a modal; task detail with state banner (awaiting review / revision requested / rejected / completed), submit work as text + link + up to 5 files, resubmit new versions, full submission history and feedback.
- **Submissions** (`/intern/submissions`): tabs by review status, jump straight to the resubmit form for revisions.
- **Feedback** (`/intern/feedback`): all mentor feedback with rating summary and type filters.
- **My progress** (`/intern/progress`): date range and weekly / monthly grouping, trend, status and priority charts, performance history (on time / late), activity timeline, CSV export and print.
- Task rules: interns reach 99% on their own; a task becomes Completed (100%) only when a mentor approves a submission.

## Admin app pages
- **Dashboard** (`/admin/dashboard`): 8 live KPI cards, task completion trend (daily / weekly / monthly), completed-vs-pending donut, intern performance bars, tasks by priority, individual intern performance panel, upcoming deadlines, recent activity. Date range presets or custom range.
- **Interns** (`/admin/interns`, `/admin/interns/:id`): searchable, filterable, sortable, paginated table (filters live in the URL); add / edit modal with skills and one-time temporary password; deactivate / reactivate / permanent delete with confirmation; profile page with stats, weekly progress chart, task history, submissions, feedback, activity and "assign task".
- **Tasks** (`/admin/tasks`, `/admin/tasks/:id`): table and kanban board views with search, status / priority / category / intern / deadline filters, overdue-only toggle, sorting, pagination and CSV export; create / edit with attachments; drag a card between columns to change status; task detail with submission history, feedback thread and status changes.
- **Submissions** (`/admin/submissions`, `/admin/submissions/:id`): review queue (awaiting review by default), version history, approve / request revision / reject with feedback and star rating.
- **Reports** (`/admin/reports`): interns CSV, filtered tasks CSV, and a printable per-intern progress report (Print / Save as PDF or CSV).
- Notification links (e.g. "New submission to review") open the right admin page.

## App foundation
- JWT session handling: token storage, session restore on reload, automatic sign-out on expired/invalid tokens, protected routes with role guards (wrong role is redirected to its own dashboard)
- App shell: collapsible sidebar (drawer on mobile), top bar, notification bell (live unread count, mark read), user menu, light / dark / system theme (no flash on load), skip-to-content link
- UI kit (`src/components/ui`): Button, Input / PasswordInput / Textarea / Select / TagInput, Card, Badge, ProgressBar / ProgressRing, Avatar, Modal (focus trap, Esc), ConfirmDialog, Popover / Dropdown, DataTable (sorting, skeletons, empty and error states) with Pagination, Tabs, StatCard, PageHeader, Skeletons, EmptyState / ErrorState, Toasts, ErrorBoundary
- Hooks: `useFetch`, `useForm` (with server-validation mapping), `useDebounce`, `useDisclosure`, `useLocalStorage`, `useClickOutside`
- Pages: Login (Admin / Intern toggle), intern registration, Admin dashboard (8 live stat cards, status distribution, upcoming deadlines, recent activity), Intern dashboard (progress ring, stats, deadlines, feedback), Settings (profile + avatar, password change, appearance), 404
- Sidebar entries for pages that ship in later phases are shown disabled with a "Soon" tag, so there are no dead links

## Environment variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `development` / `production` | development |
| `PORT` | API port | 5000 |
| `MONGO_URI` | MongoDB connection string (required) | - |
| `JWT_SECRET` | Long random secret (required) | - |
| `JWT_EXPIRES_IN` | Token lifetime | 7d |
| `CLIENT_URL` | Allowed CORS origin(s), comma separated | http://localhost:5173 |
| `LOGIN_RATE_LIMIT` | Max login attempts per IP per 15 min | 20 |
| `REGISTRATION_RATE_LIMIT` | Max intern registration attempts per IP per hour | 5 |
| `DISABLE_CRON` | `true` disables the deadline scheduler | false |

## Scripts
| Command | Action |
|---------|--------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start in production mode |
| `npm run seed` | Seed demo data (skips if data exists) |
| `npm run seed:reset` | Wipe all collections, then seed |
| `npm run test:e2e` | End-to-end API tests (needs the server running on a freshly seeded DB; set `API_URL` if not `http://localhost:5000`) |

## Demo credentials (created by seed)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@internhub.com | Admin@123 |
| Intern | ali@internhub.com | Intern@123 |
| Intern | sara@internhub.com, hamza@internhub.com, fatima@internhub.com | Intern@123 |

Change these passwords before any real deployment.

## API overview
All responses: `{ success, ... }`; errors: `{ success: false, message, errors? }`. Send `Authorization: Bearer <token>`.
List endpoints accept `page`, `limit` (max 100) and `sort=field:asc|desc`, and return `{ items, pagination: { total, page, limit, pages } }`.

**Auth** (`/api/auth`)
| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| POST | `/login` | public | `{ email, password, role: "admin" \| "intern" }` returns `{ token, user }` |
| GET | `/me` | any | current user |
| PUT | `/profile` | any | name, phone, avatar (+ skills / designation) |
| PUT | `/avatar` | any | multipart field `avatar` |
| PUT | `/change-password` | any | `{ currentPassword, newPassword }` |

**Interns** (`/api/interns`, admin only)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/` | `search`, `status`, `department`, `sort` (name, createdAt, overallProgress, joiningDate), includes `taskCounts` |
| GET | `/departments` | filter dropdown values |
| POST | `/` | create; omit `password` to get a one-time `temporaryPassword` |
| GET | `/:id` | profile + stats + recent activity |
| PUT | `/:id` | edit (admin can also reset `password`) |
| PUT | `/:id/avatar` | multipart |
| DELETE | `/:id` | deactivate; `?permanent=true` hard-deletes with all related data |

**Tasks** (`/api/tasks`; interns only ever see their own)
| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET | `/` | any | filters: `intern`, `status`, `priority` (comma lists), `category`, `search`, `deadlineFrom`, `deadlineTo`, `overdue=true`, `dueWithin=<days>`; sort: deadline, createdAt, title, progress, priority |
| GET | `/board` | any | kanban columns (Pending / In Progress / Completed / Overdue), same filters |
| GET | `/categories` | any | |
| GET | `/:id` | any | task + submission history + feedback |
| POST | `/` | admin | multipart (`attachments`) or JSON; notifies the intern |
| PUT | `/:id` | admin | edit / reassign / extend deadline (revives overdue tasks) |
| PATCH | `/:id/status` | admin | `{ status, progress? }` |
| PATCH | `/:id/progress` | intern | `{ progress: 0-99, status? }`; finish by submitting work |
| DELETE | `/:id` | admin | |

**Submissions** (`/api/submissions`)
| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| POST | `/` | intern | multipart: `task`, `description`, `link`, `files` (any one is enough); auto-versioned |
| GET | `/`, `/:id` | any | filters `status`, `task`, `intern` |
| PATCH | `/:id/review` | admin | `{ status: approved \| rejected \| revision_requested, feedback, rating }` |

**Others**
| Endpoint | Access | Description |
|----------|--------|-------------|
| `GET/POST/DELETE /api/feedback` | list: any, write: admin | standalone feedback on a task |
| `GET /api/notifications`, `/unread-count`; `PATCH /:id/read`, `/read-all`; `DELETE /:id`, `/` | any | in-app notifications |
| `GET /api/dashboard/admin?from&to&groupBy` | admin | cards, status/priority breakdown, trend, intern performance, upcoming deadlines, recent activity |
| `GET /api/dashboard/intern` | intern | personal cards, charts, feedback, submissions |
| `GET /api/dashboard/interns/:id` | admin | one intern's performance |
| `GET /api/activity` | any | activity timeline (interns: own) |
| `GET /api/search?q=` | any | global search |
| `GET /api/reports/interns.csv`, `/tasks.csv` | admin / any | CSV export (task filters apply) |
| `GET /api/reports/progress/:internId[?format=csv]` | admin / own | printable progress report data |

## Workflow and business rules
- Admin assigns task -> intern is notified -> intern sets progress (0-99) -> intern submits work (progress becomes at least 90%) -> admin approves (task Completed, 100%) or requests revision / rejects (task back to In Progress, intern resubmits as version 2, 3, ...).
- Overall intern progress = average progress across their tasks, recalculated on every change.
- A scheduler (every 10 min and on boot) marks tasks Overdue and sends one "deadline approaching" reminder 24h before. Dashboards and filters also compute overdue from the deadline, so they are accurate between runs. Set `DISABLE_CRON=true` to turn it off.
- Dashboard date filters (`from`, `to`) apply to tasks by creation date; trend charts default to the last 30 days.

## Security notes
- Passwords hashed with bcrypt (cost 12); never returned in responses
- JWT carries `id` + `role`; the user is re-loaded from the DB on every request, so deactivated accounts lose access immediately
- Role guard via `authorize('admin')` middleware
- Helmet, CORS allow-list, login rate limiting, request sanitizing against `$` operator injection, input validation (express-validator)
- File uploads: extension allow-list, 10 MB limit, random file names

## Project structure
```text
frontend/src/
├── components/ui/      reusable UI kit
├── components/common/  ErrorBoundary, ProtectedRoute, NotificationBell, status badges ...
├── layouts/            AppLayout, Sidebar, Topbar, AuthLayout
├── pages/              auth, admin, intern, shared
├── context/            Auth, Theme, Toast
├── hooks/  services/  utils/  assets/  __tests__/
backend/
├── config/        env + database connection
├── controllers/   request handlers
├── middleware/    auth, RBAC, validate, sanitize, upload, error
├── models/        Admin, Intern, Task, Submission, Feedback, Notification, Activity
├── routes/        route definitions (mounted in routes/index.js)
├── services/      activity log + notification helpers
├── utils/         ApiError, asyncHandler, token, pagination, seed
├── uploads/       uploaded files (git-ignored)
├── app.js         Express app
└── server.js      entry point
```

## Testing
```bash
# Backend: API must be running on a freshly seeded DB
cd backend && npm run seed:reset && npm start      # terminal 1 (set LOGIN_RATE_LIMIT=1000 in .env)
cd backend && npm run test:e2e                      # terminal 2 -> 98 checks

# Frontend
cd frontend && npm test                             # 94 mocked tests
npm run seed:reset --prefix ../backend              # fresh data for the real-API suite
E2E_API=1 VITE_API_URL=http://localhost:5000/api npm test    # + 18 real-API tests (CLIENT_URL must allow http://localhost:3000)
```
The real-API suite mutates data (adds an intern, completes tasks), so reseed before each run.

## Deployment notes
- Backend: set `NODE_ENV=production`, a strong `JWT_SECRET`, your MongoDB Atlas `MONGO_URI` and `CLIENT_URL` (the exact web-app origin). Uploaded files live in `backend/uploads`; use persistent storage (or move to S3) on hosts with ephemeral disks.
- Frontend: set `VITE_API_URL=https://your-api.example.com/api` before `npm run build`, then serve `frontend/dist` as a static site with an SPA fallback to `index.html`.

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| `CORS` / network error in browser | Add the web-app origin to `CLIENT_URL` in `backend/.env` and restart the API |
| `429 Too many login attempts` | Wait 15 min or raise `LOGIN_RATE_LIMIT` (development only) |
| Login says invalid credentials after seeding | Choose the right role tab (Admin / Intern); run `npm run seed:reset` |
| Uploaded files do not show | Check that `/uploads` is proxied (dev) or `VITE_API_URL` points at the API host (prod) |
