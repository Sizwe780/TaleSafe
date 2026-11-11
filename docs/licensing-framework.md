# Licensing and integration requirements supplied by the user

The user supplied the following product requirements after the original MVP. These describe the requested future behavior, not a claim that the existing MVP executes contracts, verifies identity, holds escrow or detects infringement.

## Licensee eligibility

- Anyone may browse a public catalog. Publish only creator-authorized metadata; private original assets remain private.
- Binding requests require a Verified Licensee. Entra sign-in alone must not be treated as KYC or KYB.
- Individuals need verified identity through an agreed provider or approved verification process.
- Organizations need a verified business domain, company registration number and named contact. Merely entering these fields does not verify them.

## Required structured term sheet

- Scope is selected from an enum: print publication, digital or ebook publication, audio adaptation, film or TV adaptation, classroom educational material, AI model training, and AI RAG indexing.
- Duration is fixed term with an explicit length or perpetual. Do not infer a default binding term.
- Territory is worldwide, Pan-Africa or a specified country.
- Exclusivity is exclusive or non-exclusive for the selected right and term.
- Compensation is a flat fee, a defined royalty/revenue share, or free/pro-bono for eligible verified educational/NGO use. Record currency and exact amounts/percentages; do not invent pricing.
- A submitted binding request requires all applicable fields and verified eligibility. Draft preparation may be available before verification, clearly marked non-binding.

## Community authority

- Cultural heritage stories must be linked to a registered Community Entity.
- Requests enter a mandatory community review queue. The uploader alone cannot approve them.
- Only authorized community administrators may approve terms; identity and authority need an agreed trusted verification source.
- Beneficiary/payment routing must point to the verified Community Entity, not automatically to the uploader.

## Approval and delivery requirements

- User intent is an executed digital contract incorporating the term sheet, with both parties' signatures and an auditable timestamp/hash record.
- A file hash is an integrity record; do not represent it as proof of a person's identity or their signature.
- Obtain approved contract boilerplate, governing-law requirements and a signing provider/workflow before enabling execution. Preserve copyright ownership according to approved terms; do not fabricate legal terms.
- Invoices and flat-fee payment collection follow the agreed contract workflow. Actual escrow requires a verified supported arrangement; a payment gateway or database balance must not be labelled escrow without evidence.
- Licensee delivery remains locked until the required signatures, authority approvals and payment conditions are verified. Never unlock an asset from a browser return URL alone.

## Payments

- The user has no merchant account yet and requested real provider-ready pages, using Payfast as the initial target.
- Build honest billing/invoice/integration states without invented balances or successful transactions.
- Live checkout, signed ITN validation, reconciliation, refunds, payout routing and any escrow arrangement require verified configuration and provider support. Sandbox and live states must be visibly distinct.

## Monitoring priorities

- Start with Copyscape Premium for text matching and SerpApi for search-result discovery, as requested.
- Other user-proposed sources: Common Crawl, Spawning, permitted targeted access to publishing sites, YouTube Data API and audio fingerprinting providers.
- Verify each API's current capabilities before implementation. Search hits are potential matches for review; a URL in a crawl archive does not by itself prove training by any particular model.
- Require creator authorization before sending private story excerpts to matching/search providers. Keep API keys server-side and obtain them through private files or approved secret storage.
- Do not assume access to private AI datasets, restricted sites, paywalled content or automated global scanning without a supported authorized source.

## Open external requirements

Verification provider/process, authorized operator accounts, contract template and jurisdiction, signing provider, verified community entities/administrators, Payfast merchant/sandbox configuration, payment and payout country/currency confirmation, and Copyscape/SerpApi credentials remain to be supplied or agreed. Build independent foundations while these are pending and keep dependent actions unavailable.

## Additional user decisions

- Verification candidates are VerifyNow and Didit. The requested individual flow is South African ID/name plus live selfie, with identity/face checks against an authorized DHA source where actually supported by the selected provider and workflow. Do not assume every candidate or workflow provides direct DHA access.
- Organization review must establish CIPC registration/status and active directors, then verify that the acting person's identity matches an authorized director. User-entered registration/contact data alone cannot confer verified status.
- Community entities may be NPCs, NPOs or trusts. Identity/entity checks must be followed by a human Trust and Safety mandate review of an uploaded signed resolution, letter of authority or trust deed. Do not activate community authority from uploader self-approval.
- Governing jurisdiction is the Republic of South Africa.
- Approved contract boilerplate is still to be drafted. The user explicitly requested `docs/legal/templates/standard_license_placeholder.txt` for preview generation; it must remain visibly non-binding and must not be substituted for an approved contract.
- Signing provider candidates are SigniFlow or DocuSign; no provider is selected. The user permits a mock signing API for development. Such a mock must never produce a signed/legally executed state, unlock assets or collect money. The story SHA-256 hash is not a human signature.
- Copyscape/SerpApi keys are still being obtained; ask again when their integration is ready for live testing. Do not repeatedly request them before independent implementation is ready.
