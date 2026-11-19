# Staging migrations

Generate `001-initial.json` once from compiled entities against an EMPTY isolated MySQL using `node dist/devsecops/database.js generate`. Review and commit the generated SQL statements before shipping. Deployment runs only `migrate`, never schema synchronization or generation. Checksums detect edits to applied migrations. MySQL DDL is not transactional: restore a backup after partial migration failure. Never run these tools against production.
