# License Rotation Playbook

Use this checklist whenever you need to rotate or reissue customer licenses.

## 1. Capture Current State
- Export existing licenses for audit: `curl -X GET https://backend.youware.com/api/licenses > licenses_backup.json`
- Note any disabled or expired serials that should remain blocked post-rotation.

## 2. Generate Replacement Serials
- For bulk updates, use the Settings → Licenses → “New License” form or script batch inserts via the Worker.
- Prefer new serial patterns that encode customer alias, plan, and issue date for traceability (e.g. `ALPHA-YEAR-20251002`).
- Insert new license rows with status `active` and corresponding expiry dates. Use the Cloudflare Worker endpoint `POST /api/licenses/generate` with `planType`, optional `userName`, `prefix`, `randomLength`, `startDate`, and `expiryDate` to mint a serial automatically.
- Mark superseded serials as `disabled` but keep them in the table for historical reconciliation.
- Optional: add notes indicating rotation reason (`notes = 'Rotated on 2025-10-02 replace compromised key'`).
- For dry-runs, call `GET /api/licenses/preview-serial?planType=yearly&prefix=ALPHA` to preview the serial, start, and expiry dates without creating a row.

## 3. Stage Changes
- Mark superseded serials as `disabled` but keep them in the table for historical reconciliation.
- Optional: add notes indicating rotation reason (`notes = 'Rotated on 2025-10-02 replace compromised key'`).

## 4. Notify Integrations
- Send customers the new serial and rotation deadline.
- If the Python client is embedded, ship an updated config that carries the replacement serial.
- Update any CI/CD secrets or environment variables referencing the old serial.

## 5. Cutover & Cleanup
- Set an enforcement date; after that date, delete or disable the previous serials.
- Confirm the Clients tab in the app shows only the new serials.
- Archive `licenses_backup.json` with rotation notes.
