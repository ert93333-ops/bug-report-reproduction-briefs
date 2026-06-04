# Bug Report Reproduction Briefs

Static browser-local MVP for turning public-safe bug report notes into a reproducible engineering handoff.

## Public pages

- Landing: `https://ert93333-ops.github.io/bug-report-reproduction-briefs/`
- Template: `https://ert93333-ops.github.io/bug-report-reproduction-briefs/bug-report-reproduction-template.html`

## Scope

- No Jira, Linear, GitHub Issues, support-system, crash-reporting, log, repository, file-upload, email, billing, analytics API, external database, or backend integration.
- No root-cause diagnosis, source-code inspection, live-log reading, SLA advice, warranty advice, compensation advice, legal advice, compliance advice, or contract interpretation.
- Shared marketing and notification credentials stay in the private root `.env` of the Hermes playbook, not in this public site directory.

## Verification

From the Hermes playbook root:

```powershell
npm run workflow:bug-report-reproduction
```

