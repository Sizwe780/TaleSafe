# Product mock audit

Audit date: 2026-11-11. The original MVP scope is complete. This audit covers the additional work requested afterward.

## Product behavior

| Location | Behavior identified in the initial audit | Replacement and required evidence |
| --- | --- | --- |
| `client/app/dashboard.tsx` Story tracking | Two hard-coded examples about an anthology and film enquiry | Replace with actual registrations and license activity from PostgreSQL. Label these as activity, not external detection. Real external usage monitoring needs a source/provider and matching policy. |
| `client/app/dashboard.tsx` Revenue dashboard | Fixed R 0.00 balances and pending payout text | Remove illustrative amounts in favor of an explicit unconnected state. Real earnings, refunds and payouts require a payment provider, account configuration, currency, payout countries and verified transaction/webhook records. |
| `client/app/dashboard.tsx` Smart licensing | Creator can submit a mock request for an owned story | Add a real request/review workflow with requester identity, intended use, creator approval/decline and an audit history. Define terms, authority and grant conditions before representing an approval as an executed license. |
| `server/src/licenses.js` | Consent-checked pending requests persist; no grant or payment occurs | Preserve consent enforcement, ownership boundaries and duplicate protection. Add review transitions and access checks only after the workflow's scope is agreed. |
| `client/app/globals.css` demo-label | Styling for labels on simulated features | Update labels only with the corresponding behavior; styling changes alone do not make integrations real. |

## Intentional examples and testing infrastructure

- Form `placeholder` attributes are input hints, not mocked product behavior. Preserve them.
- Identity, database and storage mocks in `server/test/` isolate unit tests. Preserve them and add integration acceptance checks separately.
- `server/fixtures/sample-story.txt` is a disposable acceptance fixture. It is not a fabricated production registration.
- Historical statements in the original four-milestone plan document the delivered MVP. Keep that history and add follow-on status rather than rewriting old validations.
- The Word product overview accurately describes the initial MVP. Update the document after replacements are implemented and verified.

## Sequence

1. Publish the documented MVP and this audit to the new public GitHub repository.
2. Replace illustrative tracking with real stored activity and remove dummy financial amounts. Neither requires an external monitoring or payment credential to display an honest state.
3. Confirm licensing review and terms requirements with the user, then implement the agreed workflow and tests.
4. Confirm monitoring/payment integrations and obtain configuration through approved private sources. Verify live behavior before marking those integrations complete.

## External information to obtain

- Licensing: who may request use, which permissions an approval grants, approval authority for community-connected work, duration/territory restrictions, pricing and whether payment is required before any grant.
- Monitoring: intended sources to monitor, permitted access, exact-copy versus similarity matching, frequency and what constitutes a reviewable finding.
- Payments: provider or existing merchant account, currency, countries, payout model, refunds and webhook verification configuration. No credentials belong in chat or Git.

The remaining product mock behavior is concentrated in the dashboard and licensing API. A global text replacement would misrepresent functionality and damage legitimate test fixtures; changes must follow the implementation sequence above.

## Verified first replacements

- Added owner-scoped `GET /api/activity` backed by actual Story and License records. The browser displays real registration and enquiry titles/timestamps/statuses; no invented examples remain in that panel.
- Removed all illustrative R 0.00 amounts and payout promises. Revenue now explicitly states that payments are not connected and no balances are being reported.
- 22 server tests and the production build pass. Live browser verification showed two actual registrations and their related pending enquiries from PostgreSQL, plus the honest payment state.
- Licensing remains labelled mock until the verified-licensee and contract framework in `docs/licensing-framework.md` is implemented. The user selected Payfast as an initial integration target but has no merchant account yet; monitoring should begin with Copyscape and SerpApi.
