TaillogToss GitHub automation rules. Keep this file slim.

- Parity: AUTH-001, IAP-001, B2B-001, SEC-AIT.
- Do not add secrets, tokens, certificates, or environment values to workflow files.
- Prefer deterministic checks that can run on pull requests without privileged credentials.
- If a workflow needs live deployment credentials, make it opt-in and document the required secret names.
