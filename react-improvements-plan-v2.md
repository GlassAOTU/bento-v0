# React Improvements Plan v2 - Bento Anime

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

PLANS.md is checked into the repo at `PLANS.md`. This plan must be maintained in accordance with that file.

## Purpose / Big Picture

The goal is to improve user-perceived stability and maintainability of the React client without changing product behavior. After this work, dark mode assets no longer flash on first load, auth state is sourced from the shared AuthContext instead of per-component Supabase calls, session and request state are easier to reason about, and watchlist data loading is cached and more predictable. The user should be able to load the home page in dark mode with no banner/logo flicker, open watchlist modals without repeated fetch jitter, and navigate between pages without losing recommendation and discover search context.

## Progress

- [x] (2026-01-25 22:32Z) Drafted v2 plan after reviewing `PLANS.md`, `react-improvements-plan.md`, and the current codebase.
- [x] (2026-01-25) Milestone 1: remove theme-dependent rendering for banner and logo images.
- [x] (2026-01-25) Milestone 2: consolidate client auth access via AuthContext and remove per-component Supabase auth fetches.
- [x] (2026-01-25) Milestone 3: extract sessionStorage synchronization into dedicated hooks for the home recommendations flow.
- [x] (2026-01-25) Milestone 4: add React Query-backed watchlist data loading that preserves item counts and preview images.
- [x] (2026-01-25) Milestone 5: refactor WatchlistModal state management to reduce race conditions and unused state.
- [x] (2026-01-25) Milestone 6: simplify AuthContext loading states while preserving debounce protection.
- [x] (2026-01-25) Milestone 7: introduce ModalBase and migrate a small subset of modals as proof.
- [x] (2026-01-25) Milestone 8: documented React Query migration criteria - deferred until triggers met.

## Surprises & Discoveries

- Observation: `app/HomeClient.tsx` and `components/NavigationBar.tsx` use `useTheme()` to switch banner/logo images, which can render light assets before the resolved theme is available, causing a flash on first paint. Evidence: `app/HomeClient.tsx` uses `theme === 'dark'` in the banner section; `components/NavigationBar.tsx` does the same for the logo.
- Observation: The original plan's CSS-only approach used `hidden` with new classes, which can conflict with Tailwind display utilities and produce unexpected visibility. Evidence: the proposed `light-only`/`dark-only` utilities would need to override `hidden` and `sm:block` combinations.
- Observation: `components/WatchlistModal.tsx` already stores `skippedWatchlists` but never populates it, and multi-select add can race because `addAnimeToWatchlist` toggles a shared `adding` flag per call. Evidence: `skippedWatchlists` is set but not updated; `selectedWatchlists.forEach(id => addAnimeToWatchlist(id))` triggers multiple async writes with shared state.
- Observation: The watchlist UI expects `item_count` and `preview_images`, but the draft `useWatchlists` hook did not include these fields. Evidence: `WatchlistModal` renders `watchlist.item_count` and `watchlist.preview_images`.
- Observation: `lib/hooks/useRecommendations.ts` contains non-trivial caching, rate-limit handling, and analytics, so a direct React Query migration would be high risk without parity tests. Evidence: the hook manages `cachedRecs`, `seenTitles`, and `rateLimitInfo`, and uses localStorage for rate limiting while `app/HomeClient.tsx` owns the sessionStorage writes; the hook only clears sessionStorage in `clearAll()`.

## Decision Log

- Decision: Use Tailwind `dark:` variants for banner and logo assets instead of new global CSS utilities to avoid display conflicts and reduce new CSS surface area. Rationale: the `dark` class is already applied on `<html>` before hydration, so Tailwind variants render correctly without JS. Date/Author: 2026-01-25, Codex.
- Decision: Replace per-component Supabase auth fetches with `useAuth()` from `lib/auth/AuthContext.tsx`. Rationale: the AuthContext already provides `user` and `loading`, and reducing new APIs keeps churn low. Date/Author: 2026-01-25, Codex.
- Decision: Keep recommendations logic in `useRecommendations` for this iteration and defer React Query migration until parity tests exist. Rationale: the hook contains bespoke caching and rate-limit behavior that would be expensive to re-implement without user-visible risk. Date/Author: 2026-01-25, Codex.
- Decision: Introduce React Query only for watchlist data where caching yields immediate UX wins and behavior is already replicated in multiple components. Rationale: this is a contained change with clear acceptance checks. Date/Author: 2026-01-25, Codex.
- Decision: Migrate only a small subset of modals to the new ModalBase initially, specifically `components/anime/ReviewModal.tsx` and `components/ClearConfirmDialog.tsx`, and defer more complex overlays like `components/AuthModal.tsx` and `components/UnauthenticatedWatchlistOverlay.tsx`. Rationale: prove the base component with simple consumers before touching complex flows. Date/Author: 2026-01-25, Codex.
- Decision: Process multi-select watchlist adds sequentially and roll up results at the end. Rationale: this avoids partial success UI races while preserving existing backend behavior. Date/Author: 2026-01-25, Codex.
- Decision: Keep sessionStorage refactors scoped to `app/HomeClient.tsx` and leave `lib/hooks/useRecommendations.ts` unchanged. Rationale: avoids regressions in the recommendation flow while still reducing duplicated storage effects. Date/Author: 2026-01-25, Codex.
- Decision: Keep `profileFetchInProgress` as a separate deduplication guard when introducing the AuthContext status enum. Rationale: separates UI status from fetch concurrency control. Date/Author: 2026-01-25, Codex.
- Decision: Defer focus trapping in ModalBase until after the base component proves stable. Rationale: minimize initial migration risk and scope. Date/Author: 2026-01-25, Codex.
- Decision: Invalidate watchlist queries on any watchlist mutation, including add-to-watchlist. Rationale: keeps counts and previews consistent without extra local bookkeeping. Date/Author: 2026-01-25, Codex.
- Decision: Add operational triggers to the recommendations migration milestone rather than leaving it open-ended. Rationale: makes the milestone actionable and repeatable. Date/Author: 2026-01-25, Codex.

## Outcomes & Retrospective

No implementation has been performed yet. This section will be updated after each milestone with outcomes and remaining gaps.

## Context and Orientation

The home recommendations experience is rendered by `app/HomeClient.tsx`, which uses `lib/hooks/useRecommendations.ts` and stores session state in `sessionStorage`. The navigation header is in `components/NavigationBar.tsx` and switches logos based on theme. Auth state is managed centrally by `lib/auth/AuthContext.tsx`, which is provided in `app/layout.tsx` and accessed by `useAuth()`. The watchlist modal is `components/WatchlistModal.tsx`, which fetches watchlists and items via Supabase client calls and controls several UI sub-states. React Query is already wired in `app/providers.tsx` but is not yet used in client hooks.

In this plan, “React Query” means the `@tanstack/react-query` cache and request coordination library already installed in the project. A “watchlist” is a saved list of anime stored in the Supabase `watchlists` table and displayed in the Watchlist modal and the My Anime page. “Dark mode flash” refers to a brief incorrect light image that appears before the theme resolves on first load.

## Plan of Work

### Milestone 1: Dark mode assets without JS

Update `app/HomeClient.tsx` and `components/NavigationBar.tsx` to remove `useTheme()` and render both light and dark assets using Tailwind `dark:` classes. Use paired `Image` elements where one is visible in light mode and the other is visible in dark mode, and keep existing responsive behavior by applying `sm:hidden` and `sm:block` directly to each image. This removes the runtime theme dependency and the initial flash while preserving the layout. No changes to `app/globals.css` are required.

### Milestone 2: Centralize auth state usage

Replace the per-component `createClient().auth.getUser()` calls in `components/AnimeCard.tsx` and `components/DiscoverAnimeCard.tsx` with `useAuth()` and use the `user` value for analytics. In `app/(pages)/discover/DiscoverClient.tsx`, remove the Supabase auth initialization and the `onAuthStateChange` listener, and use `useAuth()` for `user` and `loading` instead. Keep the `trackDiscoverSearch` and `trackDiscoverFormatFilter` calls intact, but source their auth status from the shared `user` object. Destructure only the needed fields and do not add a new wrapper hook.

### Milestone 3: Session storage helpers for recommendations

Create a small hook module at `lib/hooks/useSessionStorage.ts` that exposes two helpers: one for restoring a value once and one for synchronizing a value on change. Use these helpers inside `app/HomeClient.tsx` to replace the current five `useEffect` blocks that manually read and write `sessionStorage`. Preserve special keys such as `auth_flow_in_progress` and `recommendations_auto_load` and the current logic that clears them after restoration. This milestone should not change the behavior of `lib/hooks/useRecommendations.ts`, only reduce duplication in the component.

### Milestone 4: React Query-backed watchlist loading

Introduce `lib/hooks/useWatchlists.ts` that fetches a user’s watchlists and enriches them with `item_count` and `preview_images`, matching the shape expected in `components/WatchlistModal.tsx`. Implement the fetching logic inside the hook using the existing Supabase client queries and the same fields used in `fetchWatchlists` today. Use `useAuth()` to pass the user id and enable the query only when a user is available, and return loading and error states consistent with the existing UI. Update `components/WatchlistModal.tsx` to consume the hook, show the unauthenticated overlay only after auth has finished loading, and invalidate the query after any mutation, including creating a watchlist or adding an anime. This ensures the modal does not refetch from scratch every time it opens and keeps counts in sync.

### Milestone 5: WatchlistModal state refactor

Refactor `components/WatchlistModal.tsx` to use `useReducer` for its view state, selection state, and submission status. The reducer must explicitly model unauthenticated state so the overlay is controlled by a single source of truth, and it must also model selection vs creation views, and success or error states so that state transitions are centralized and race conditions from parallel async operations are prevented. Multi-select add operations must run sequentially with a rollup summary at the end; populate `skippedWatchlists` when duplicates are detected and keep success messaging deterministic. The goal is to preserve the current UX while removing implicit state coupling.

### Milestone 6: AuthContext loading simplification

Simplify `lib/auth/AuthContext.tsx` to use a single status enum while retaining the existing debounce guard for profile fetches. Preserve the public `loading` and `profileLoading` booleans by deriving them from the status. Ensure `refreshProfile` continues to avoid concurrent fetches by honoring the `profileFetchInProgress` guard. Update any direct references in components if necessary.

### Milestone 7: ModalBase introduction

Create `components/ui/ModalBase.tsx` that handles portal creation, backdrop click-to-close, escape handling, and body scroll lock, with focus trapping explicitly deferred. Migrate `components/anime/ReviewModal.tsx` and `components/ClearConfirmDialog.tsx` to use this base component, keeping their content unchanged. This provides a low-risk proof of the base component before migrating more complex modals.

### Milestone 8: Re-evaluate recommendations and discover React Query migration

**Status: Deferred** - Migration criteria documented below. Do not proceed until all triggers are met.

**Migration Triggers (ALL required):**
1. M1-M7 merged and stable for 2+ weeks in production
2. User reports zero dark mode flashes or watchlist loading issues
3. Test coverage exists for `useRecommendations` rate limit and caching logic

**Parity Checklist (must match current behavior):**
- [ ] Rate limit detection and popup trigger
- [ ] Rate limit reset countdown accuracy
- [ ] SessionStorage restore on navigation return
- [ ] SessionStorage clear on new search (non-append)
- [ ] SeenTitles deduplication across "See More" calls
- [ ] Analytics: `trackRecommendationSeeMoreClicked` with correct counts
- [ ] LocalStorage recent search saving
- [ ] Fork flow: auto-scroll + auto-load on return

**Parity Checklist for Discover:**
- [ ] Search debounce timing preserved
- [ ] Format filter analytics tracking
- [ ] URL param sync for search/filters
- [ ] Popular anime JSON loading

**Decision:** Do NOT migrate until triggers met and parity tests written. Current hooks work correctly.

## Concrete Steps

All commands should be run from the repository root at `/Users/rahat/Desktop/development/personal/bento-v0`.

    npm install
    npm run lint
    npm run build
    npm run dev

When running the dev server, keep a browser open to verify dark mode and watchlist behavior as the changes are made.

## Validation and Acceptance

After Milestone 1, a hard refresh on the home page and the navigation bar in dark mode should show the correct dark assets immediately, without a light image flash. After Milestone 2, analytics should still record auth status changes, and no component should call `supabase.auth.getUser()` for basic presence checks. After Milestone 3, recommendations should restore correctly after navigation, and sessionStorage keys should be updated only when state changes. After Milestone 4, the watchlist modal should open instantly after a first load, show item counts and preview images, and reflect newly created watchlists or added anime without requiring a manual refresh. After Milestone 5, the watchlist modal should handle multi-select additions sequentially, present a single deterministic success or error rollup, and not leave unused state in the reducer. After Milestone 6, auth loading states should remain accurate during OAuth and email flows. After Milestone 7, the Review and Clear Confirm modals should still close via backdrop and ESC, and body scroll should be locked while open. Milestone 8 has no execution requirement until a migration plan is drafted and approved. Manual verification is sufficient for this iteration; automated tests are out of scope.

## Idempotence and Recovery

All edits are safe to apply incrementally. If a change causes regressions, revert only the affected file and re-run `npm run build` to confirm the rollback. Session storage updates are idempotent and can be tested by clearing browser storage and reloading. React Query cache issues can be validated by a hard refresh or by clearing site data in the browser.

## Artifacts and Notes

Capture short before and after screenshots of the home page banner and navigation logo in dark mode to prove the flash is resolved. When testing watchlist loading, note the console output for any Supabase errors and include a brief snippet of the query response shape if it differs from expectation. Include any unexpected behavior encountered during reducer refactors in the Surprises & Discoveries section as evidence.

## Interfaces and Dependencies

The plan relies on the existing `@tanstack/react-query` provider already configured in `app/providers.tsx` and the `useAuth()` hook from `lib/auth/AuthContext.tsx`. The new session storage helper should be defined in `lib/hooks/useSessionStorage.ts` with a minimal API like:

    export function useSessionStorageRestore<T>(key: string, setter: (value: T) => void): void
    export function useSessionStorageSync<T>(key: string, value: T, enabled?: boolean): void

The watchlist hook should expose a shape compatible with the current `WatchlistModal` view model, including item counts and preview image URLs, for example:

    export type WatchlistSummary = {
        id: string
        name: string
        description: string | null
        cover_image_url: string | null
        item_count: number
        preview_images: string[]
    }

    export function useWatchlists(userId: string | null): {
        data: WatchlistSummary[] | undefined
        isLoading: boolean
        error: Error | null
        refetch: () => void
    }

ModalBase should take the minimal set of props needed for the simple modals in this plan, such as:

    export type ModalBaseProps = {
        isOpen: boolean
        onClose: () => void
        children: React.ReactNode
        className?: string
    }

Revision Note: This v2 plan replaces the earlier CSS-only image switching approach with Tailwind `dark:` variants, removes the proposed `useCurrentUser` hook in favor of `useAuth`, scopes React Query adoption to watchlists only, and defers recommendations migration due to parity risk. The changes were made to align the plan with the current codebase and to reduce regression risk.
Revision Note: Updated Milestones 3 through 8 to clarify scope, sequential multi-select behavior, cache invalidation, and operational triggers; corrected sessionStorage ownership in Surprises & Discoveries; and confirmed manual-only validation. These changes reflect agreed tradeoffs to minimize regression risk while keeping UI behavior stable.
