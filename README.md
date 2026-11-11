[Watch the TaleSafe showcase on Loom](https://www.loom.com/share/a7d6a417eeff4c0783b446f113810293)

# TaleSafe Africa

TaleSafe Africa is a creator rights workspace for African storytellers. It connects story registration, digital fingerprints and explicit usage permissions with a structured licensing process.

Creators upload a text or PDF story, choose commercial and AI permissions, and manage the record from their dashboard. Files stay in private Azure storage. Creators decide whether a story's title and permissions appear in the public catalog.

## Features

- **Story registration:** Text and PDF uploads up to 10 MiB, with a SHA-256 fingerprint calculated from the original bytes before storage.
- **Consent and permissions:** Explicit commercial use, AI training and cultural heritage selections.
- **Creator workspace:** Registered stories, timestamps, fingerprints, catalog visibility and actual registration/enquiry activity.
- **Public catalog:** Creator-published titles and permissions, with original files kept private.
- **Licensing workspace:** Licensee profiles, structured non-binding term-sheet drafts and community entity applications.
- **Authority safeguards:** User-entered details do not verify a person, business or community mandate. Binding submission and asset delivery remain blocked until trusted checks and approved contract/signing arrangements are connected.

A digital fingerprint supports file integrity comparisons. It does not establish authorship, prevent copying outside the platform or act as a person's legal signature.

## Licensing and community protection

A term sheet records the proposed scope, duration, territory, exclusivity, commercial intent and financial terms. Supported scopes include print, digital publication, audio, film/TV, classroom education, AI model training and AI RAG indexing. Proposals can specify a flat fee, royalties or eligible pro-bono use.

Drafts are unsigned and non-binding. Cultural heritage stories require verified community authority and human mandate review before any binding workflow can proceed. The development preview uses an explicitly unapproved placeholder and never grants rights, collects money or unlocks an asset. Historical MVP enquiries remain identifiable as legacy records; new mock-enquiry submissions are retired.

External identity verification, approved contracts, signing, payments and monitoring require their respective providers and configuration. The revenue view reports an unconnected payment state instead of invented balances. Story activity describes events within TaleSafe, not external copying or proof of AI training.

## Technology

| Layer | Technology |
| --- | --- |
| Client | Next.js, React, TypeScript and Tailwind CSS |
| API | Node.js and Express |
| Database | PostgreSQL with Prisma and the pg adapter |
| Authentication | Microsoft Entra ID with PKCE and persistent server sessions |
| File storage | Private Azure Blob Storage |
| File integrity | SHA-256 |

## Getting started

### Prerequisites

- Node.js 22.12 or later and npm.
- A PostgreSQL database with permission to apply the application migrations.
- A single-tenant Microsoft Entra Web app registration.
- An Azure Storage account and a private container for story files.

Register `http://localhost:3001/auth/callback` as a **Web** redirect URI in Entra.

### Install and configure

```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

Copy environment examples only for a fresh installation. Preserve populated configuration when working with an existing checkout.

| Server variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | At least 32 random characters for session signing |
| `ENTRA_TENANT_ID` | Microsoft Entra directory ID |
| `ENTRA_CLIENT_ID` | Registered application ID |
| `ENTRA_CLIENT_SECRET` | Application secret value |
| `ENTRA_REDIRECT_URI` | Callback URI; locally `http://localhost:3001/auth/callback` |
| `CLIENT_ORIGIN` | Allowed client origin; locally `http://localhost:3000` |
| `AZURE_STORAGE_CONNECTION_STRING` | Server-side Azure Storage credential |
| `AZURE_STORAGE_CONTAINER` | Existing private container name |

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in the client environment. Only the API address belongs in this public client setting; never put credentials there.

### Prepare the database

```powershell
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:check
```

Use versioned migrations rather than `db push`. The session table is migration-managed alongside the application tables.

### Run locally

Start each service in a separate terminal:

```powershell
npm run dev:server
```

```powershell
npm run dev:client
```

Open [TaleSafe](http://localhost:3000). The API listens on port 3001. The server checks configuration and database connectivity before listening. Story uploads return 503 if Azure storage is not configured.

## Pages

| Page | Purpose |
| --- | --- |
| `/` | Sign-in and the authenticated creator workspace |
| `/catalog` | Public, creator-authorized metadata listings |
| `/licensing` | Licensee profiles, term-sheet drafts and community applications |

The workspace pages share navigation, typography, responsive spacing and form styling.

## API overview

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Database connectivity |
| `GET /api/me` | Signed-in profile |
| `POST /api/stories` | Authenticated multipart story registration |
| `GET /api/stories` | Owner-scoped, paginated story metadata |
| `PATCH /api/stories/:id/publication` | Owner-controlled catalog visibility |
| `GET /api/catalog` | Published metadata only |
| `GET /api/activity` | Recent registrations and relevant enquiries |
| `GET /api/stories/:id/permissions` | Permissions for an accessible story |
| `GET` and `PUT /api/licensee-profile` | Private verification-profile details |
| `GET` and `POST /api/license-drafts` | Private, structured proposals |
| `POST /api/license-drafts/:id/submit` | Binding-submission gates; unavailable until required integrations are configured |
| `POST /api/license-drafts/:id/signing-preview` | Unsigned development preview, unavailable in production mode |
| `GET` and `POST /api/community-applications` | Unverified community applications |

Story registration uses multipart fields `file`, `title`, `aiConsent`, `commercialUse` and `culturalHeritage`. AI consent is `NOT_ALLOWED`, `ALLOWED` or `COMPENSATION_REQUIRED`; permission flags are the strings `true` or `false`.

Story and catalog pagination accept `limit` from 1 to 50 and a nonnegative `offset`. Activity accepts a bounded `limit`. Authenticated browser writes enforce the configured origin, and ownership comes from the session.

## Checks

```powershell
npm test
npm run build
npm run db:validate
npm run db:check
```

Unit tests isolate external services. Live checks require real service configuration and an authenticated browser session supplied by the user:

```powershell
npm run verify:registration --workspace server -- <private-browser-cookie-file>
npm run verify:foundations --workspace server -- <acceptance-story-id>
```

The registration verifier creates an acceptance sample and checks the persisted record against the Azure blob's bytes and hash. The foundation verifier reads the specified structured acceptance draft. Cookie files may use a Netscape jar, a copied Cookie header or its raw named-cookie value; keep them private under the ignored `.verification/` directory. Never reconstruct cookies from database sessions or paste them into chat.

## Configuration safety

Never commit environment files, storage keys, browser cookies, identity documents, the local secrets file, `.verification/`, generated outputs or dependencies. Example environment files contain placeholders only. Use a secret store when hosting the application.

Hosted authentication requires HTTPS and matching origins/registered redirects. Session cookies are HTTP-only, same-site lax and secure in production mode. Deploy the client and API on the same site and configure the trusted reverse proxy appropriately.

## Documentation

- [Product overview snapshot](docs/TaleSafe%20Africa%20Overview%20Updated.docx)
- [Licensing and community framework](docs/licensing-framework.md)
- [Provider integration research](docs/provider-research.md)
- [Mock behavior audit](docs/mock-audit.md)
- [Implementation plan](docs/plan.md)
- [Verification record and durable project memory](docs/documentation.md)

The overview document describes the MVP snapshot. See the licensing framework for verification, community authority and contract requirements.
