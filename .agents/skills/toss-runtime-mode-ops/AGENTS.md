# toss-runtime-mode-ops Skill Folder

Role: runtime mode orchestration skill for TaillogToss AIT, Toss console, Supabase Edge, and local QA.

Rules:
- Keep this folder small: `SKILL.md` only unless deterministic scripts become necessary.
- Do not store secrets, API keys, certificates, or real console credentials here.
- Treat production charge, mass message, promotion reward, and real campaign send as approval-gated operations.
