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
- **Status:** In progress.
- **Tasks:** Update the README, include the product overview, publish a public source repository without credentials or local verification files, and inventory mock product behavior and external dependencies.
- **Validation:** Verify the remote repository is public and contains the intended source/documentation commit. Document real behavior versus remaining simulations.
- **Execution:** Complete and verify publication before implementing the next milestone. Preserve isolated test mocks and form input placeholders.

### Milestone 6 Replace supported mock behavior
- **Status:** Pending Milestone 5.
- **Tasks:** Replace example tracking with actual stored activity where supported. Define and implement creator review of permission requests without inventing contract terms. Replace dummy financial balances with a truthful integration state until a payment provider is selected.
- **External information:** Ask the user for usage-monitoring sources, licensing approval/terms requirements, payment provider, currency and payout country when needed. Do not claim live rights enforcement, usage monitoring, payment settlement or royalties without verified integrations.
- **Validation:** Test data ownership, actual persisted activity, permitted request-state transitions and honest empty/unconfigured states; verify the UI and update docs before publishing changes.
