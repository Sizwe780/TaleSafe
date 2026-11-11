# TaleSafe Africa - Project Status

## Completion State

**The original four MVP milestones are implemented and verified (2026-11-11).** Each milestone passed its acceptance gate before the next one began. Follow-on publication and implementation requested afterward are tracked below and in the extended plan.

| Milestone | Final evidence |
| --- | --- |
| 1. Scaffolding, Database & Auth | Next.js serves on 3000; Express on 3001; PostgreSQL migration/table checks pass; real Entra sign-in, profile, dashboard session and sign-out pass |
| 2. Story Registration API & Hashing | Authenticated curl returned 201; PostgreSQL permissions persisted; the real private Azure blob's bytes and SHA-256 metadata match the sample |
| 3. Creator Dashboard UI | Production build passes; signed-in browser renders the uploaded story, timestamp, AI compensation flag, commercial/heritage flags, tracking demo and revenue placeholders |
| 4. Smart Licensing System | Browser shows Educational/Film/AI company tiers; submitting Educational updates the story card to Request pending; separate PostgreSQL verification confirms the related REQUESTED license; status survives page reload |

## Verification Evidence

- `npm test`: **19 passing** server checks covering authentication, callback replay and nonce behavior, safe diagnostics, file/permission validation, hash-before-upload ordering, ownership, private containers, cleanup on persistence failure, pagination, license policy enforcement, duplicate requests and permission queries.
- `npm run build`: passes production compilation and TypeScript checks.
- Prisma schema validation, client generation, initial migration deployment and live database table checks passed. No resets, truncation or seed data were used.
- Live API logs `PostgreSQL connection successful`, listens on 3001, and returns 200/connected at `/health`; anonymous profile and story registration calls return 401.
- Actual Microsoft authorization-code sign-in returns a persisted creator profile. Browser welcome/dashboard and UI sign-out were verified. No runtime auth bypass was added.
- Live registration command: `npm run verify:registration --workspace server -- ../.verification/browser-request-header.txt.txt`.
- Acceptance story ID: `fec9b707-c854-44d6-950a-c89c1c13c90c`. File: `server/fixtures/sample-story.txt`. AI consent: COMPENSATION_REQUIRED; commercial use: false; cultural heritage: true.
- The registration verifier invoked curl, required HTTP 201, read the PostgreSQL record, downloaded the Azure blob, compared exact bytes/fingerprint metadata and checked that the container is private.
- Live licensing command: `npm run verify:license --workspace server -- fec9b707-c854-44d6-950a-c89c1c13c90c`.
- PostgreSQL returned Educational license `3756d2e2-a165-4509-a3b6-da601d31fb3a` with status `REQUESTED`, created by the browser form. The story's license state is normalized in its related License records and displayed from that relation, rather than duplicated on Story.
- Browser reload preserved the pending status. Tracking examples and revenue balances are explicitly labelled demo/placeholder; no payment processing or actual usage detection was built.
- Dependency installation/audit reported zero vulnerabilities after selecting patched Prisma/MSAL versions and installing the Azure SDK/Multer.

## Implementation Decisions

- npm workspaces: Next.js/Tailwind client and Express API; PostgreSQL via Prisma 7.10.1 and the JavaScript pg adapter for this Windows ARM64 environment. Installed versions are locked in package-lock.json.
- Entra single-tenant confidential Web app uses PKCE, state, expected nonce, tenant/object-ID checks, session rotation and PostgreSQL-backed sessions. The registered redirect URI is `http://localhost:3001/auth/callback`.
- MSAL Node 7 requires the original expected nonce during token exchange; the live callback failure was repaired by passing it before independent claim validation. A regression check covers that SDK contract.
- Session cookies are HTTP-only, same-site lax and secure under production HTTPS. API responses use no-store caching. The migration manages the session table outside Prisma's application models; use migrations, not db push.
- Uploads require explicit consent/permissions and accept one nonempty UTF-8 text or PDF file up to 10 MiB. SHA-256 is computed on original bytes before Azure upload. Names use owner/story IDs; the Azure container must be private; overwrites are prohibited. Persistence failure triggers blob cleanup.
- Four in-flight uploads per API process bound multipart buffering. Authentication and origin checks run before buffering. Registration is unavailable with 503 if Azure configuration is missing; authentication can still run.
- Story listing validates bounded pagination and filters by the signed-in creator. It returns selected metadata without blob access URLs or other creators' data.
- Licensing uses mock enquiries only. Educational is noncommercial; Film requires commercial permission; AI company requests require AI consent. Compensation-required requests remain pending and do not bypass payment/approval. Client restrictions are enforced again by the API.
- Requests are serialized against a locked story row; repeat pending requests reuse the existing record. The live cloud database exposed Prisma's default interactive-transaction timeout; bounded maxWait=10s and timeout=30s repaired the acceptance failure.
- Error diagnostics report fixed stages and safe identity/Entra/Prisma codes, never raw upstream messages, authorization codes, credentials or signed blob URLs.

## Private Configuration and Authorization

- Database, Entra and Azure values are already populated in ignored `server/.env`. The user-provided `env secrets for new env.txt` is also ignored. Do not overwrite populated configuration with the example file.
- Azure container: `talesafe-stories`, created and verified private using the supplied account connection string.
- The user explicitly supplied the browser-cookie file `.verification/browser-request-header.txt.txt` and authorized its use for the sample upload. The verifier accepts raw named-cookie values, Cookie request headers or a Netscape cookie jar. Header credentials go through curl stdin, not command arguments.
- A proposed database-session-to-cookie reconstruction was rejected by automatic approval review. It did not execute, its helper was removed, and it was never retried or used indirectly. The authorized browser-supplied file resolved that blocker.
- All `.verification/` files are ignored. No cookie or secret values were printed or committed by verification scripts. Cookie files expire with their browser sessions; obtain a fresh browser-supplied file for future curl acceptance runs.

## Running and Rechecking

From the repository root:

```powershell
npm install
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:check
npm test
npm run build
```

Run the API and client in separate terminals:

```powershell
npm run dev:server
npm run dev:client
```

For production-build preview:

```powershell
npm run start --workspace server
npm run start --workspace client
```

Open `http://localhost:3000`. The latest production preview is running there (client process session 83911); the latest API runs on 3001 (session 4671, PID 36056). Check live handles/ports before restarting them. The browser shows the authenticated workspace with actual activity and an explicit unconnected payment state.

The two live verifier commands above remain available. Registration verification creates another acceptance story, so run it only when a new live upload check is needed. License verification is read-only and requires an existing Educational REQUESTED record.

See `README.md` for environment setup, API contracts and deployment constraints. This task delivered the local MVP; licensing, usage tracking and revenue features have the mock scope required by the plan.

## Product Overview Document

Created docs/TaleSafe Africa Overview.docx at the user's request. The two-page document explains the purpose, intended users, creator workflow, AI consent, licensing tiers and current MVP limits. Both pages were rendered through Microsoft Word and visually checked; no QA intermediates are part of the deliverable.

## Follow on publication and implementation

- User requested an updated README, GitHub publication, and subsequent replacement of mocked product behavior where supported; ask for external information as needed.
- README now explains the product, working versus simulated features, setup variables, commands, API contracts and the product overview document.
- User selected a new **public** `Sizwe780/TaleSafe` repository. Connected GitHub profile confirms the account. The repository has been created and its public visibility verified.
- Initialized local Git on main with the account's GitHub noreply commit email. Credentials, verification files, generated outputs, dependencies and Word lock files are excluded.
- The GitHub connector supports source upload but has no repository-creation action. The user completed browser sign-in. The public repository was created through the browser, then all 38 scanned source/documentation files were uploaded through the connector. Main commit: `bc7baea3f65fa72049bc1826234e4f17c989c36b`; tree: `9b88e4fcc0644e9e1dc6e174aa92b79ae3ac2099`. Remote ref and complete tree were verified. No credentials, cookie files, Word lock files, dependencies or build outputs were included.
- `docs/mock-audit.md` inventories product simulations, preserved test mocks/input hints and the external information needed for real replacements.
- Milestone 5 is complete. Local main tracks origin/main at the published commit, with identical tree verified. Initial local commits are preserved on `mvp-local-snapshot`.
- Milestone 6 begins with real registration/license activity and an explicit unconnected payment state. User was asked for licensing grant policy, payment provider/currency/country and external monitoring sources. Do not implement those dependent integrations without the required answers.
- Milestone 6's supported changes are now implemented and verified: `GET /api/activity` reads owner-scoped registrations and owner/requester-scoped enquiries, validates bounded limits and returns real records in time order. The UI refreshes this activity after mutations. Removed static anthology/film examples and dummy monetary amounts.
- 22 backend tests pass, including ownership, chronology, result bounds and honest empty/error activity responses. Production build and TypeScript pass. The live browser showed actual registrations/enquiries and Payments not connected; it asserted no external monitoring or financial balance.
- The original Word overview is open in Word and could not be overwritten. Preserved it and created `docs/TaleSafe Africa Overview Updated.docx` reflecting the replacements; both pages were rendered and visually checked.
- User supplied the detailed future licensing/community/contract/payment framework now preserved in `docs/licensing-framework.md`; selected Payfast-ready pages without an existing merchant account and Copyscape/SerpApi as initial monitoring targets. Additional provider/contract/authority questions are pending. New milestones 7–9 cover these foundations and their external gates.

## Verified licensing foundations and documentation

- Milestone 7 foundations are complete. Applied additive migration `202611110002_licensing_foundations`; live database checks passed. Profiles and community applications cannot self-verify. Binding submission, legal signatures, payment and asset delivery remain unavailable until their external gates are satisfied.
- 28 backend tests pass, covering catalog privacy, owner-only publication, profile verification resets, structured term-sheet validation, story consent, community authority and unsigned preview boundaries. Client build and TypeScript checks passed.
- The authenticated browser saved a non-binding Educational draft for the acceptance story: 12 months, South Africa, non-exclusive, ZAR 5,000. Read-only `verify:foundations` confirmed persisted draft `dcb19f00-50af-4ca2-9843-ef2c858976d1`. The development preview visibly remained unsigned and unapproved, with no rights or asset release.
- Catalog visibility defaults to private and exposes only explicitly published metadata. Only the acceptance sample was published by the agent for verification; user-managed publication choices were preserved.
- Creator, catalog and licensing pages use a shared navigation/layout component. Browser checks at 1280px confirmed matching heading position (288px), matching main width and no horizontal overflow after session loading. Stable scrollbar space prevents page-to-page shifts.
- User requested a Loom showcase link at the top of README. Added the supplied link and rewrote README as evergreen product/setup documentation without production progress updates. Execution evidence remains here.
- Latest running service handles at verification: API session 25118 (PID 28944), client session 72177. Check live ports/processes before restarting; earlier handles above are historical.
- Publish this verified foundation and README before starting Milestone 8. Payfast merchant credentials, signing/template approval, identity verification configuration and monitoring keys remain unavailable. Ask again for the private monitoring-key file when live monitoring checks become possible.
