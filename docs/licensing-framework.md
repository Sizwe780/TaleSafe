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
