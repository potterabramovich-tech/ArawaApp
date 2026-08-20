# Development workflow

This workflow keeps `main` deployable while Arawa is developed incrementally.

## Branches

- Create each change from an up-to-date `main` branch.
- Use short-lived branches such as `feature/<name>`, `fix/<name>`, or `chore/<name>`.
- Run `pnpm check` from `mobile/` before opening a pull request.
- Merge through a reviewed pull request after CI passes; do not commit directly to `main`.
- Keep local environment files, generated output, and recovery/reference folders out of commits.

## Pull requests

A pull request should describe its scope, verification performed, and any follow-up decisions. UI changes should include screenshots. Keep unrelated changes in separate pull requests so they can be reviewed and reverted safely.

## Main-branch protection rollout

After this workflow has been pushed and its first CI run succeeds, protect `main` in GitHub with these settings:

1. Require a pull request before merging.
2. Require the `verify-mobile` status check to pass.
3. Require branches to be up to date before merging.
4. Block force pushes and branch deletion.
5. Keep administrator bypass available only for documented recovery.

Branch protection is intentionally not enabled before the CI check exists on GitHub, which avoids locking the repository behind a status check that cannot run yet.
