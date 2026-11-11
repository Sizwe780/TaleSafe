# TaleSafe Africa

TaleSafe Africa helps African storytellers register their work, record commercial and AI training permissions, and manage licensing enquiries from a creator workspace.

Creators upload a text or PDF story, choose its permissions, and receive a SHA-256 fingerprint calculated from the original bytes before private Azure storage. The dashboard brings registration details, consent and licensing request status together.

[Read the product overview](docs/TaleSafe%20Africa%20Overview.docx).

## Current capabilities

The initial four implementation milestones are complete. The MVP has been verified with real Microsoft Entra sign-in, PostgreSQL persistence, a curl upload to Azure, and a licensing request submitted through the browser. The production build and 19 backend tests pass.

| Area | Current behavior |
| --- | --- |
| Authentication | Microsoft Entra ID, PKCE and PostgreSQL-backed sessions |
| Story registration | Private text/PDF uploads up to 10 MiB, SHA-256 fingerprints and ownership records |
| Consent registry | Explicit commercial use, AI training and cultural heritage selections |
| Creator dashboard | Owner-filtered story list, registration timestamps, fingerprints and consent flags |
| Licensing | Persisted pending enquiries for Educational, Film and AI company tiers, with consent checks |
| Story tracking | Labelled example data; external usage is not monitored |
| Revenue | Placeholder balances; no payment collection, royalties or payouts |

Licensing enquiries currently demonstrate the request workflow. They grant no rights and process no payment. A fingerprint supports file integrity comparisons; it does not establish authorship or prevent copying outside TaleSafe.

## Project structure

```text
client/    Next.js and Tailwind creator interface
server/    Express API, Prisma schema, migrations and tests
docs/      Product overview, implementation plan and verification record
```

The authoritative execution state and milestone evidence live in [docs/documentation.md](docs/documentation.md). Follow [docs/implement.md](docs/implement.md) and complete each validation gate in [docs/plan.md](docs/plan.md) before proceeding.

## Prerequisites

- Node.js 22.12 or later and npm.
- A PostgreSQL database with permission to create the application tables.
- A single-tenant Microsoft Entra app registration configured as a **Web** application, with `http://localhost:3001/auth/callback` registered as its redirect URI, plus a client secret value.

## Setup (PowerShell)

```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

For an existing installation, preserve populated environment files rather than copying the examples over them.

Edit `server/.env` with real credentials and a randomly generated session secret of at least 32 characters. Keep these files private. Database migrations and the API use the same `DATABASE_URL`. This project never provides a development authentication bypass.

| Server setting | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | At least 32 random characters for session signing |
| `ENTRA_TENANT_ID` | Microsoft Entra directory ID |
| `ENTRA_CLIENT_ID` | Registered application ID |
| `ENTRA_CLIENT_SECRET` | Application secret value |
| `ENTRA_REDIRECT_URI` | Web callback, locally `http://localhost:3001/auth/callback` |
| `CLIENT_ORIGIN` | Client origin, locally `http://localhost:3000` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage credential; keep it on the server |
| `AZURE_STORAGE_CONTAINER` | An existing private story container |

The client uses `NEXT_PUBLIC_API_URL`, locally `http://localhost:3001`. This is an API address, never a secret. Register the exact callback URI as a **Web** redirect in Entra.

```powershell
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:check
npm run dev:server
```

In another terminal:

```powershell
npm run dev:client
```

The client runs at `http://localhost:3000`; the API runs at `http://localhost:3001`. The server validates configuration and connects to PostgreSQL before listening. Successful startup logs `PostgreSQL connection successful`.

## Milestone 1 verification

```powershell
npm test
npm run build
curl.exe -i http://localhost:3001/health
curl.exe -i http://localhost:3001/api/me
```

Health must return 200 with `database: connected`; an anonymous profile request must return 401. Open the client, select **Continue with Microsoft**, complete a tenant sign-in, and confirm the welcome message. Sign out and confirm the sign-in button returns. Automated authentication tests use a mocked identity provider and do not replace this live sign-in gate.

For production, serve both services through HTTPS, set `NODE_ENV=production`, configure HTTPS origin/redirect values and the Entra registered redirect URI, and place the API behind one trusted reverse proxy. Cookies are HTTP-only, same-site lax and secure in production; sessions persist in PostgreSQL. The two services should be deployed on the same site so browser same-site cookie rules work. Logout ends the local TaleSafe session.

## Story registration API (Milestone 2)

Configure `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER` in `server/.env` using an existing **private** Azure container, then restart the API. Missing storage configuration disables uploads with 503 while sign-in remains available. Public containers are rejected.

`POST /api/stories` requires an authenticated session and multipart form data:

| Field | Required value |
| --- | --- |
| `file` | One nonempty UTF-8 `.txt` or PDF file, at most 10 MiB |
| `title` | 1–200 characters |
| `aiConsent` | `NOT_ALLOWED`, `ALLOWED`, or `COMPENSATION_REQUIRED` |
| `commercialUse` | `true` or `false` |
| `culturalHeritage` | `true` or `false` |

The API fingerprints the original bytes before sending them to Azure. A 201 response contains the persisted story record, including `id`, `createdAt`, `sha256` and consent/permission selections. Ownership comes from the authenticated session. No public blob URLs or storage credentials are returned. A database failure after upload triggers blob cleanup. Upload concurrency is bounded to four requests per API process.

Live acceptance requires a private curl cookie jar from a real Entra-authenticated session. Keep it under the ignored `.verification/` directory. Then run:

```powershell
npm run verify:registration --workspace server -- ../.verification/creator-cookies.txt
```

The verifier invokes curl with `server/fixtures/sample-story.txt`, requires HTTP 201, checks the database record and downloads the stored Azure blob to compare its exact bytes, SHA-256 metadata and private-container configuration. It leaves the acceptance sample registered for dashboard verification. The verifier never creates an authentication bypass or prints cookie values.

The verifier also accepts a file containing browser-copied request headers from an authenticated `http://localhost:3001/api/me` request. Save these privately to `.verification/browser-request-headers.txt` and supply that path instead. It forwards only the `talesafe.sid` cookie to the local API through curl's stdin, never command arguments. Do not paste cookies into chat or reconstruct them from database session records.

## Creator dashboard (Milestone 3)

After sign-in, the home page becomes the creator workspace. Register stories with explicit permissions, inspect original timestamps and SHA-256 fingerprints, and see AI consent and the latest mock licensing request. Story Tracking uses labelled example data; Revenue is a placeholder with no payment integration.

`GET /api/stories?limit=20&offset=0` returns `{ stories, total, hasMore }` for the signed-in creator only. Limit is 1–50; offset is a nonnegative integer. Unknown parameters are rejected. Story cards include the latest related license request; no private file URLs are exposed.

## Smart licensing (Milestone 4)

Select a registered story and an Educational, Film or AI company tier, then submit a mock request. Its pending status appears on the story card and persists after refresh. Educational covers noncommercial enquiries; Film requires commercial permission; AI company requests are rejected when AI training is not allowed. Compensation-required requests remain pending. Requests grant no rights and process no payments.

- `POST /api/stories/:storyId/licenses`: authenticated JSON `{ "tier": "EDUCATIONAL" }`, `FILM` or `AI_COMPANY`. Returns 201 with a `REQUESTED` record; repeated pending requests return 200 with the same record. The requester comes from the session. Invalid payloads return 400; unavailable stories 404; prohibited usage 409. Browser writes require the configured origin.
- `GET /api/stories/:storyId/permissions`: authenticated query of AI consent, commercial use and cultural heritage for a known story ID. No file URL or creator contact data is returned.

The normalized `License` relation holds each story's request status. To verify an Educational request after submitting through the UI:

```powershell
npm run verify:license --workspace server -- <story-id>
```

This command reads PostgreSQL and requires an Educational `REQUESTED` record. Licensing transactions lock the story row to serialize permission checks and duplicate-request detection; a bounded 30-second timeout accommodates the remote database.

## Verification and development

```powershell
npm test
npm run build
npm run db:validate
npm run db:check
```

Unit tests use isolated identity, database and storage dependencies. Live acceptance checks require the real services and a browser-authenticated cookie supplied by the user. The registration verifier creates a sample story; the license verifier only reads an existing request.

Never commit `.env` files, storage keys, browser cookies, the local secrets text file, `.verification/`, build outputs or `node_modules/`. Example environment files contain placeholders only. Use your deployment platform's secret storage when hosting the application.

## Replacing the remaining demo behavior

The follow-on audit and implementation sequence is recorded in [the plan](docs/plan.md). Replacements should use real stored events and verified integrations. Usage detection needs an agreed monitoring source; payments need a provider, currency and payout requirements; granting licenses needs defined creator approvals and terms. Renaming demo data does not make those integrations live.
