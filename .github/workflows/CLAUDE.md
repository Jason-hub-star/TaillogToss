TaillogToss GitHub workflow rules. Keep this file slim.

- Parity: AUTH-001, IAP-001, B2B-001, SEC-AIT.
- Workflows must fail closed for security checks and avoid printing secret-bearing environment values.
- Run static security tests covering both frontend/AIT gates and Supabase Edge/RLS gates: `Backend/tests/test_frontend_security_static.py` and `Backend/tests/test_supabase_security_static.py`.
- Run backend security regression tests for session auth, PII log redaction, B2B scoping, report access, referral rewards, subscriptions, and dashboard dog ownership.
- Release artifact scans may run conditionally when ignored local artifacts are absent in CI, but local release scripts must enforce the scan before upload.
