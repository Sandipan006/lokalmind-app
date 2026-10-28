# Contributing to LokalMind

## Development setup

```bash
git clone https://github.com/Sandipan006/lokalmind-app.git
cd lokalmind-app
npm install
cp .env.example .env
npx expo run:ios       # or run:android (dev build required - not Expo Go)
```

The `.env.example` ships with all public defaults pre-filled - **you do not need to change anything** to get the app running locally. Model downloads work out of the box via the public CDN.

The only values you need to fill in yourself:
- `IOS_BUNDLE_IDENTIFIER` / `ANDROID_PACKAGE` - your own bundle ID (e.g. `com.yourname.lokalmind`)
- `EAS_PROJECT_ID` / `APP_OWNER` - only for EAS cloud builds, not needed for local dev
- `DEVELOPER_CONTACT_EMAIL` - only if building a custom fork

Native modules (`llama.rn`, `whisper.rn`) require a dev build. Expo Go will not work.

## Branches

| Pattern | Purpose |
|---------|---------|
| `main` | Stable, production-ready |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, deps, docs |

## Pull requests

- Keep PRs focused - one concern per PR.
- All business logic changes must include or update unit tests.
- Run `npm run lint` before opening a PR; zero lint errors required.
- PR description must explain the *why*, not just the *what*.

## Code style

- TypeScript strict mode - no `any`.
- Clean Architecture: domain layer has zero third-party imports.
- MobX ViewModels: `makeAutoObservable(this)` first; all mutations inside `runInAction`.
- Use `Result<T>` flows for use cases; never throw across layer boundaries.
- Use `logger.debug` from `@/src/core/logger` instead of `console.log`; it is silent in production builds.

## License note

This project is MIT licensed. By submitting a pull request you agree your contribution will be licensed under the same terms.
