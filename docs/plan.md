# TaleSafe Africa - Implementation Plan

## Milestone 1: Scaffolding, Database & Auth
- **Status:** Complete and verified; evidence in `docs/documentation.md`.
- **Tasks:** Initialize Next.js client and Express server. Set up PostgreSQL schema (Users, Stories, Licenses). Configure Entra ID auth.
- **Validation:** Express server runs on port 3001. Next.js runs on port 3000. DB connection logs success. User can authenticate.
- **Stop-and-fix:** Ensure database schema syncs without errors before moving on.

## Milestone 2: Story Registration API & Hashing
- **Status:** Complete and verified against real Azure Blob Storage and PostgreSQL.
- **Tasks:** Create backend upload endpoint. Implement SHA-256 hash generation for the file. Integrate Azure Blob Storage SDK. Save story metadata (including AI Consent Status and Usage Permissions) to PostgreSQL.
- **Validation:** A curl POST request with a sample `.txt` file successfully uploads to Azure, generates a hash, and returns a 201 status with the DB record.

## Milestone 3: Creator Dashboard UI
- **Status:** Complete and verified in the authenticated browser with uploaded story metadata.
- **Tasks:** Build Next.js dashboard pages using Tailwind CSS. Fetch user's stories from the backend. Display the "Story Tracking" mock data and "Revenue Dashboard" placeholders.
- **Validation:** Frontend successfully renders a list of uploaded stories, timestamps, and their AI usage status flags.

## Milestone 4: Smart Licensing System
- **Status:** Complete; UI submission and persisted PostgreSQL REQUESTED status verified.
- **Tasks:** Build Next.js UI for the Smart Licensing System (showing license tiers: Educational, Film, AI company). Build backend endpoints to process a mock license request.
- **Validation:** Submitting a license request via the UI successfully updates the story's license status in the database.

## Follow on work requested after the MVP

The original four milestones above remain complete. The user has authorized README updates, publication to a new public `Sizwe780/TaleSafe` GitHub repository, and a full audit followed by replacements for mocked product behavior where sufficient information is available.

### Milestone 5 GitHub publication and mock audit
- **Status:** Complete. Public repository `https://github.com/Sizwe780/TaleSafe` contains the verified 38-file source tree at commit `bc7baea3f65fa72049bc1826234e4f17c989c36b`.
- **Tasks:** Update the README, include the product overview, publish a public source repository without credentials or local verification files, and inventory mock product behavior and external dependencies.
- **Validation:** Verify the remote repository is public and contains the intended source/documentation commit. Document real behavior versus remaining simulations.
- **Execution:** Complete and verify publication before implementing the next milestone. Preserve isolated test mocks and form input placeholders.

### Milestone 6 Replace supported mock behavior
- **Status:** Implemented; 22 tests and production build pass; live browser verification shows actual registrations/enquiries and no dummy financial amounts. Final docs publication is in progress.
- **Tasks:** Replace example tracking with actual stored activity. Replace dummy financial balances with a truthful integration state until a payment provider is selected. Record the user's expanded licensing and integration framework as follow-on milestones.
- **External information:** Ask the user for usage-monitoring sources, licensing approval/terms requirements, payment provider, currency and payout country when needed. Do not claim live rights enforcement, usage monitoring, payment settlement or royalties without verified integrations.
- **Validation:** Test data ownership, actual persisted activity, permitted request-state transitions and honest empty/unconfigured states; verify the UI and update docs before publishing changes.

### Milestone 7 Verified licensing foundations
- **Status:** Pending Milestone 6 publication.
- **Tasks:** Implement creator-controlled catalog visibility, licensee verification profiles and structured non-binding term-sheet drafts using `docs/licensing-framework.md`. Gate binding requests on trusted verification and authority; preserve existing MVP enquiries as legacy records. Model community entity authority without self-verification or uploader-only approval.
- **Validation:** Verify private stories are not exposed, required term-sheet fields and permissions are enforced, unverified users cannot submit binding requests, community stories cannot bypass authority checks, and drafts persist and render.
- **External gate:** Trusted verification process/provider and approved contract/signature configuration are required before executing binding contracts or granting rights. Ask for these while building independent foundations.

### Milestone 8 Payfast ready billing pages
- **Status:** Pending Milestone 7 foundation checks.
- **Tasks:** Provide actual persisted invoice/billing views and Payfast integration configuration states. Prepare server-side payment verification according to official documentation where feasible; never fabricate settlement, escrow, payouts or asset unlocks.
- **Validation:** Empty data is honest; unconfigured checkout is blocked; signature/amount/idempotency checks are tested before any ITN is trusted; fulfillment requires verified conditions.
- **External gate:** Merchant/sandbox credentials, callback hosting, currency/country, beneficiary routing and a supported escrow arrangement if escrow is required.

### Milestone 9 Opt in monitoring foundations
- **Status:** Pending earlier milestone checks.
- **Tasks:** Implement creator-authorized scan jobs and reviewable findings, starting with Copyscape and SerpApi adapters verified against official documentation. Keep unavailable providers explicit and server-side secrets private.
- **Validation:** Ownership/consent gates, bounded requests, provider response parsing, retry/error states and findings persistence; live checks require credentials. No finding automatically asserts infringement or AI-model training.
