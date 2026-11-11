# Integration research

Checked against primary documentation on 2026-11-11. These notes guide later integration work; they are not evidence that integrations are enabled.

## Payfast

- [Custom integration and ITN documentation](https://developers.payfast.co.za/docs/itn-instant-transaction-notification/) documents hosted checkout and notification handling.
- [Integration requirements](https://payfast.io/integration/submit-your-solution/) require request signatures and notification security checks, including source, signature and amount validation.
- [Sandbox differences](https://support.payfast.help/portal/en/kb/articles/what-is-the-difference-between-the-sandbox-and-the-live-payfast-system-20-9-2022) distinguish virtual test payments from live processing.
- [Split payment guidance](https://payfast.io/faq/merchant-faqs/) describes enabled merchant split arrangements. This is not proof of an escrow service. Do not label ordinary gateway collection, split payments or a database ledger as escrow.
- Merchant configuration, a reachable callback and verified ITNs are prerequisites for settlement-based fulfillment. Browser redirects alone must never unlock assets.

## Copyscape and SerpApi

- [Copyscape FAQs](https://www.copyscape.com/faqs.php) describe Premium API searches, including offline text, and JSON/XML/HTML responses. Confirm exact request and result schemas against the account's API documentation before implementing the adapter.
- [SerpApi Search API](https://serpapi.com/search-api) accepts Google queries at its search endpoint and requires a private API key. Its documented JSON response contains search metadata and structured results. Keep keys server-side and treat returned URLs as possible matches for human review.
- Creator permission to transmit private excerpts must be explicit. A search hit is not an infringement adjudication, and a successful empty search is not proof that no copies exist.

## Common Crawl

- The [Index Server](https://index.commoncrawl.org/) is a URL index, with guidance against bulk overloading. It does not by itself provide a global story-text lookup or identify which AI models trained on a page. Do not present crawl inclusion as model-training proof.

## Still requiring verification or external input

Trusted identity/business/community verification, the approved contract and signing workflow, any legally supported escrow arrangement, exact Copyscape account API configuration, Spawning's applicable text capabilities, and authorized access to proposed publishing/audio/video sources. No scraping of restricted content or bypass of paywalls is authorized by a provider suggestion.

## Identity provider checks

- [VerifyNow documentation](https://www.verifynow.co.za/documentation) lists South African identity/photo, CIPC company/director and face-match services. Account credentials and the applicable verification process are still needed before these can confer trusted status.
- [Didit developer documentation](https://didit.me/developers/) currently describes verification-session creation under `/v3/session/`, hosted verification URLs and signed webhook results. Do not build against older example versions or equate a generic workflow result with verified DHA/CIPC/director checks that were not configured and established.
- The user requested hybrid community verification, including human mandate review. No current self-service profile or application endpoint may set verification/authority flags.
