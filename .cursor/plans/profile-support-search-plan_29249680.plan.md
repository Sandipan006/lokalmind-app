---
name: profile-support-search-plan
overview: "Implement full scope (tasks 1-5): create a new feature-aligned profile/support flow, wire Support tab behavior, add chat/message search from top header flow, and migrate/rename user avatar assets with glass UI consistency."
todos:
  - id: create-branch
    content: Create and switch to branch feat/profile-support-search-glass
    status: completed
  - id: migrate-avatar-assets
    content: Move and rename old user avatar images into src/features/profile/assets/images/avatars with sequential JPG names and update references
    status: completed
  - id: build-profile-support-screen
    content: Port old support screen into new feature structure with GlassSurface and design tokens, then wire app/profile/support route
    status: completed
  - id: wire-support-tab-flow
    content: Ensure Support tab/search route opens the new support experience and remove placeholder behavior
    status: completed
  - id: implement-chat-message-search
    content: Add repository method + use case + UI wiring so search works by chat title and message text
    status: completed
  - id: verify-lint-types
    content: Run checks on touched files and fix introduced lint/type issues
    status: completed
isProject: false
---

# Profile Support Search Refactor Plan

## Decisions Locked

- Branch: `feat/profile-support-search-glass`
- Avatar destination: `src/features/profile/assets/images/avatars/`
- Avatar naming format: `user-avatar-01.jpg`, `user-avatar-02.jpg`, ...
- Scope: all tasks `1-5` in one pass
- Explicit exclusion: do not modify `src/features/models/presentation/screens/model-browser-screen/`

## Implementation Steps

- Create branch `feat/profile-support-search-glass`.
- Migrate avatar files from old assets into the new profile feature assets folder, rename sequentially, and update any imports/assignment logic to use the new names.
- Create `profile` feature in clean architecture layout (presentation-first where domain/data are added only if needed), then port old support UI into new code with design-system tokens and `GlassSurface` (no extra package).
- Replace tab `search` placeholder screen so tapping the Support tab opens the refactored support experience (not the oldcode file directly).
- Keep profile refactor excluding support-specific duplication: do not add support entry inside profile section because support already exists as tab action.
- Implement search behavior from top bar flow: users can search by chat title or message content via repository + use case + search screen wiring.
- Ensure glass treatment is applied only where visually needed (support cards/header/search input/results containers) using existing `GlassSurface` component.

## Primary Files To Change

- Tabs routing: [d:\Side Hustle\lokalmind-app\apptabs)layout.tsx](d:\Side Hustle\lokalmind-app\apptabs)layout.tsx), [d:\Side Hustle\lokalmind-app\apptabs)\search.tsx](d:\Side Hustle\lokalmind-app\apptabs)\search.tsx)
- Header trigger: [d:\Side Hustle\lokalmind-app\src\features\tabs\presentation\components\TabsTopHeader\TabsTopHeader.tsx](d:\Side Hustle\lokalmind-app\src\features\tabs\presentation\components\TabsTopHeader\TabsTopHeader.tsx)
- New support feature route wiring: [d:\Side Hustle\lokalmind-app\app\profile\support.tsx](d:\Side Hustle\lokalmind-app\app\profile\support.tsx), plus new files under `src/features/profile/presentation/screens/support-screen/`
- Chat search architecture: `src/features/chat/domain/repositories/IChatRepository.ts`, `src/features/chat/data/repositories/ChatRepositoryImpl.ts`, new use case under `src/features/chat/domain/usecases/`, and search-tab presentation wiring
- Avatar assets: `src/features/profile/assets/images/avatars/*.jpg`

## Validation

- Confirm tab tap on Support opens the new support UI.
- Confirm top bar search can find by chat name and message content.
- Confirm random avatar assignment resolves from renamed moved assets.
- Run TypeScript/lint checks on touched files and fix any introduced issues.

