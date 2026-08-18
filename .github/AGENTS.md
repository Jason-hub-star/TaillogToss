주인님이라고 불러

# .github Agent Rules

- Keep CI changes scoped to repository automation and release/security gates.
- Do not add secrets, tokens, certificates, or environment values to workflow files.
- Prefer deterministic checks that can run on pull requests without privileged credentials.
- If a workflow needs live deployment credentials, make it opt-in and document the required secret names.
