# Things only you can do

Plain steps. Tick them off as you go.

## 1. Fix ESLint - DONE

ESLint crashes because one plugin is not registered. A safety hook in Claude Code blocks edits to `eslint.config.js`, so I could not do it.

Do this:
1. Open `eslint.config.js`.
2. Find the second block, the one that starts with `rules: {` and has `'@typescript-eslint/no-explicit-any'`.
3. Add this line just above `rules: {` in that same block:
   ```js
   plugins: { '@typescript-eslint': require('@typescript-eslint/eslint-plugin') },
   ```
4. Run `npm run lint`. Tell me the result. I will fix any real lint errors.

Or: temporarily turn off the hook (`ECC_DISABLED_HOOKS=pre:config-protection`) and tell me. I will make the edit.

## 2. Check CI on GitHub (after you push)

1. Push the branch and open a PR to `main`.
2. Look at the "CI" check. It should run 4 steps. Until step 1 above is done, the lint step will fail.
3. Repo Settings -> Branches -> require the "checks" status before merging into `main` and `prod-app` (optional but recommended).

## 3. Commit

Nothing is committed. Review with `git status` and tell me when to commit.

## 4. Good-first-issue issues (6.2) - on GitHub

I did not create issues on your public repo. Suggested list (create them, label `good first issue`):
1. Fix the 4 remaining `Array<T>` style spots to `T[]` (small, safe).
2. Add unit tests for `estimateTokens` with Hindi and Bengali text.
3. Add a README screenshot gallery.
4. Improve the empty-state text on the chat history screen.
5. Add alt text / accessibility labels to the profile screen icons.

## 5. Check these facts (I guessed or could not verify)

- `CODE_OF_CONDUCT.md` uses `sandipanhiru@gmail.com` as the contact (taken from git history). Change it if you want another address.
- README "Project status": I wrote "replies within a few days". Change to what is true. I did not list supported iPhones/iOS versions because I do not know the minimum. Add them.
- `docs/project/MODEL-LICENSES.md`: open each model card and confirm the license.
- Removing 4 native packages needs a new EAS build. Do a full device smoke test before releasing.

## 6. Decision for you: review files in repo root (6.4)

`LokalMind Repository Review.md`, `LokalMind_Detailed_Review.md`, `message-fromDeveloper.md` sit in the repo root. Keep (move into `docs/`) or delete? Tell me.
