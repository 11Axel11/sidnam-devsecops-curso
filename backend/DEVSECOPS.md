# SIDNAM backend security delivery

Node 22 / npm 10. `npm ci`, `npm run build`, `npm run test:security` and `npm run security:scan` reproduce backend checks. Scanner images and rule snapshots are pinned. Security reports and SBOMs are generated privately under `artifacts/` with SHA-256 manifests.

Staging requires independent MySQL credentials, mandatory secrets, host-only prefixed cookies and disabled external services. Run the reviewed `migrations/001-initial.json` with `npm run db:migrate`, then `npm run db:seed` using random synthetic account passwords. Schema synchronization is disabled for deployments. Never seed production.

Two historical Gitleaks findings remain visible in raw reports. Their exact fingerprints are accepted only because the owner confirmed revocation on 2026-11-18; review dates and reasons are in `security/revoked-secrets.json`. This exception never applies to current-worktree findings or new fingerprints.

The remaining 14 moderate npm advisories concern transitive file-type/decompression tooling and glob/minimatch. Build paths are controlled by checked-in configuration; external archives are not accepted by the application. They remain reported, not suppressed. Upgrading the Nest CLI major or overriding transitive parser majors needs a separate compatibility review. High/critical findings block delivery.

Full documentation, deployment configuration, E2E tests and DAST live in the administrative frontend's `docs/devsecops/`. A versioned source archive of this repository is generated for the private frontend delivery, verified by SHA-256 and original commit. It contains no Git history or local environment files. Standalone backend CI scans the complete history; integration CI clearly limits its archive scan to the current worktree.
