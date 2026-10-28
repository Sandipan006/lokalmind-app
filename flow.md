# Flow

How the checks and the code fit together, as built during the TODO list. Updated as each item lands.

## Safety net (Phase 1)

```
you open a PR to main
  -> .github/workflows/ci.yml
       npm ci -> typecheck (tsc) -> lint (eslint) -> test (jest)
  -> all green? PR can merge

PR merged into prod-app
  -> .github/workflows/production.yml
       job "checks" (same 4 steps)  -- must pass
       job "build-and-submit" (needs: checks) -> EAS build -> App Store
```

## Tests

- Run: `npm test`. Config: `jest.config.js` (preset `jest-expo`, `@/` maps to the repo root).
- Tests sit next to the code in `__tests__/` folders.
- Known-bug tests use `test.failing`. They pass while the bug exists. When a Phase 2 fix lands, the test starts failing:
  change `test.failing` to `test`.

| Test | Bug | Fixed in |
|------|-----|----------|
| C01 context over 3800 tokens | F02 | 2.x |
| C02 old summary kept, new dropped | F03 | 2.x |
| C03 "I am tired" saved as a name | F01 | 2.x |
| C04 drafting request saved as fact | F01 | 2.x |
| C05 duplicate `User-stated facts:` | F01 | 2.x |

## Logging

`src/core/logger.ts` -> `logger.debug(...)`. Prints only in dev (`__DEV__`). Nothing prints in a production build.
Use `console.warn` / `console.error` only for things that must show in production.

## Send path (2.6)

```
ChatViewModel -> SendMessageUseCase / RegenerateReplyUseCase
  -> buildContextMessages (budget)
  -> llmEngine.generateResponse(msgs, { temperature, maxTokens: env.models.chatMaxTokens })
  -> llamaRnAdapter: n_predict = maxTokens   (was -1 = unlimited)
```
