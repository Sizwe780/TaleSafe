# TaleSafe Africa - Product Spec

## Goal
Build the MVP for TaleSafe Africa, a digital rights and monetization platform for African storytellers to protect, license, and track their stories.

## Tech Stack
- Frontend: Next.js, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL (via Prisma ORM)
- Storage: Azure Blob Storage
- Authentication: Microsoft Entra ID
- Security: SHA-256 hashing for digital fingerprints

## Deliverables
1. **Authentication:** Secure sign-in via Entra ID.
2. **Story Registration Engine:** Users upload stories (text/PDF), the system generates a SHA-256 fingerprint, and stores files in Azure Blob.
3. **Usage Permissions & AI Consent Registry:** Stories require metadata selection (Commercial use, AI Training Allowed/Not Allowed/Compensation Required, Cultural Heritage community flag).
4. **Creator Dashboard:** UI to view registered stories, AI licensing status, and mock revenue tracking.
5. **Smart Licensing API:** Endpoints to request permissions and query a story's AI/usage status.

## Hard Constraints
- All backend routes must be RESTful and validated.
- Do not build full payment processing yet (use mock data for the Revenue Dashboard).
- Files must be securely hashed *before* or *during* the upload to Azure.
