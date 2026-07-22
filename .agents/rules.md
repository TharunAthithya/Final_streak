# Agent Guardrails


These rules apply **at all times, including in "Always Proceed" / autonomous mode**.
If any action below is requested or about to be executed, the agent MUST stop and
ask for explicit human confirmation before proceeding. Confirmation means the
human types a clear "yes, do it" — not silence, not a prior general approval.

---

## 0. Plan review before execution
Whenever the agent is asked to create a plan (implementation plan, migration
plan, refactor plan, multi-step task breakdown, etc.), it must:
1. Present the full plan first, without starting execution.
2. Explicitly ask for review/approval before proceeding.
3. Wait for clear confirmation (e.g. "approved", "go ahead", "yes proceed") —
   not just the absence of objection — before starting any step.

This applies even in "Always Proceed" / autonomous mode. A plan is not
self-approving; producing it is not the same as being told to execute it.
If the human requests changes to the plan, the agent must re-present the
updated plan and ask for approval again before proceeding.

---

## 1. Irreversible local damage
- `git reset --hard`
- `git clean -fd` (or any `-f` variant that deletes untracked files/dirs)
- Recursive delete of `.git`, `node_modules`, or repo root paths via `rm -rf`
- `chmod -R` / `chown -R` on broad or root-level paths

## 2. Irreversible remote / history damage
- `git push --force` / `git push -f` (including `--force-with-lease` to shared branches)
- Direct `git push` to `main` or `master` (bypassing PR/review)
- `git rebase` on any branch that has already been pushed / shared with others
- `git branch -D` or deleting a remote branch (`git push origin --delete <branch>`)

## 3. Irreversible data damage
- `DROP TABLE`, `DROP DATABASE`
- `TRUNCATE`
- `DELETE` or `UPDATE` without a `WHERE` clause
- `supabase db reset`
- `supabase db push` against the remote/linked project
- Schema-altering migration commands that are destructive or non-reversible
  (e.g. `prisma migrate reset`, `alembic downgrade`, dropping columns)

## 4. Production-facing deploys & releases
- `eas submit`
- `eas build --profile production`
- `npm publish` / `pip upload` (or any package-registry publish)
- `vercel --prod` or equivalent production deploy commands
- `terraform apply` / `terraform destroy`
- Any deploy command targeting a production environment or app store

## 5. Secrets & credentials
- Creating, overwriting, or committing `.env` files or any file containing
  API keys, tokens, or credentials
- Printing/echoing secret values to logs or chat

## 6. Remote code execution
- `curl | bash`, `wget | sh`, or any pattern that pipes a remote script
  directly into a shell for execution

---

### How to handle a blocked action
1. Stop before executing.
2. Explain what the command would do and why it's flagged.
3. Ask for explicit confirmation.
4. Only proceed after receiving clear, affirmative confirmation.