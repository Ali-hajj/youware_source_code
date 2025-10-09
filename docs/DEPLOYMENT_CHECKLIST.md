# License System Deployment Checklist

Follow these steps whenever shipping license-related changes to production.

## Preflight
- [ ] Run `npm install` and `npm run build` (frontend); ensure no unexpected warnings beyond known chunk-size notices.
- [ ] From `/backend`, run `npm install` and `npm run build` to compile the Worker bundle.
- [ ] Confirm `backend/schema.sql` changes (e.g., seed licenses) are applied to the target D1 database.
- [ ] Verify `docs/python_license_client.py` points to the correct API base URL.

## Environment Validation
- [ ] Ensure `CURRENT_ENVIRONMENT` in `src/config/api.ts` remains `youware` so production resolves to the hosted Worker.
- [ ] Check that no runtime config (`ywConfig`, query params, `.env`) overrides the API base with localhost values.
- [ ] Confirm required Worker bindings (e.g., `DB`) exist in `wrangler.toml`.

## Data Integrity
- [ ] Export current licenses (`GET /api/licenses`) before changes.
- [ ] Insert or update license records as needed; mark retired serials as `disabled`.
- [ ] Smoke-test verification:
  ```bash
  curl -X POST https://backend.youware.com/api/licenses/check \
       -H "Content-Type: application/json" \
       -d '{"serial":"ALPHA1-YEAR-20251001"}'
  ```

## Frontend QA
- [ ] Users tab lists accounts without JSON parse errors.
- [ ] Licenses tab loads and the Serial Health Check call succeeds.
- [ ] Tooltips/microcopy display updated language.

## Release
- [ ] Deploy the Worker (`npm run deploy` inside `/backend`).
- [ ] Publish the frontend build to hosting (Netlify/Vercel/etc.).
- [ ] Re-run curl checks against production endpoints.
- [ ] Notify stakeholders and update clients (Python launcher, etc.) with any new serials.
