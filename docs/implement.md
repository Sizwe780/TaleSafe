# Codex Execution Rules

This is the runbook. You are operating as an autonomous coding agent.

1. **Follow the Plan:** Read `docs/plan.md`. Identify the current milestone. Do not expand scope beyond the current milestone.
2. **Execute:** Write the necessary code to complete the current milestone. Keep diffs scoped and reviewable.
3. **Verify:** Run the validation steps outlined in `plan.md` for the current milestone.
4. **Repair:** If verification fails (e.g., build errors, linting errors, failed endpoints), STOP and repair the failures immediately. Do not move to the next milestone until the current one passes all checks.
5. **Document:** Once a milestone is verified, update `docs/documentation.md` with the new status, decisions made, and commands to run it.
