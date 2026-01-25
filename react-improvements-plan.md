# React Improvements Plan - Bento Anime

## Summary

Comprehensive refactor addressing: state management, component structure, dark mode flash, and React Query integration.

---

## Phase 1: Dark Mode Flash Fix (High Priority, Low Risk)

### Problem
Banner/logo images in `HomeClient.tsx` and `NavigationBar.tsx` use `useTheme()` to conditionally render - causes flash because hook resolves after first render.

### Solution: CSS-only image switching

**Files to modify:**
- `app/globals.css` - add theme-aware utility classes
- `app/HomeClient.tsx` (lines 292-306) - replace theme-conditional images
- `components/NavigationBar.tsx` (lines 75-89) - replace theme-conditional images

**Changes:**

1. Add to `globals.css`:
```css
/* Theme-aware image switching - no JS needed */
.light-only { display: block; }
.dark-only { display: none; }
.dark .light-only { display: none; }
.dark .dark-only { display: block; }
```

2. Replace in `HomeClient.tsx`:
```tsx
// BEFORE (lines 292-306)
<Image src={theme === 'dark' ? "/images/dark.png" : "/images/light.png"} />

// AFTER
<>
  <Image src="/images/header-image.png" className="light-only hidden sm:block w-full h-auto" />
  <Image src="/images/Dekstop Banner - Dark Mode.png" className="dark-only hidden sm:block w-full h-auto" />
  <Image src="/images/MobileBanner 1.png" className="light-only sm:hidden w-full h-auto" />
  <Image src="/images/MobileBanner 1 (darkmode).png" className="dark-only sm:hidden w-full h-auto" />
</>
```

3. Same pattern for `NavigationBar.tsx` logo images.

4. Remove `useTheme()` import from both files if no longer needed.

### Verification Checkpoint 1
- [ ] `npm run build` passes
- [ ] Toggle dark mode rapidly - no flash
- [ ] Hard refresh in dark mode - banner loads correctly
- [ ] Hard refresh in light mode - banner loads correctly
- [ ] Mobile responsive banner still works
- [ ] Logo in nav switches correctly

---

## Phase 2: Custom Hooks Extraction (Low Risk)

### Problem
8+ components duplicate auth initialization pattern:
```tsx
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Solution: Create `useCurrentUser` hook

**New file:** `lib/hooks/useCurrentUser.ts`
```tsx
import { useAuth } from '@/lib/auth/AuthContext'

export function useCurrentUser() {
  const { user, loading } = useAuth()
  return {
    user,
    isAuthenticated: !!user && !loading,
    isLoading: loading
  }
}
```

**Files to modify:**
- `components/AnimeCard.tsx` - remove lines 21-30, use hook
- `components/DiscoverAnimeCard.tsx` - remove lines 20-29, use hook
- `app/(pages)/discover/DiscoverClient.tsx` - simplify auth check

### Verification Checkpoint 2
- [ ] `npm run build` passes
- [ ] Recommendations page: can add to watchlist (requires auth check)
- [ ] Discover page: anime cards show correctly
- [ ] Watchlist modal opens correctly when clicking add button
- [ ] Auth state persists across page navigation

---

## Phase 3: React Query Integration (Medium Risk)

### Problem
- QueryClient configured but unused
- Manual fetch + useState patterns everywhere
- No request deduplication or caching
- 8+ loading state declarations per component

### Solution: Add React Query hooks for common data

**New files:**
```
lib/hooks/useWatchlists.ts      - fetch user's watchlists
lib/hooks/useAnimeDetails.ts    - fetch anime page data
lib/hooks/useProfile.ts         - fetch/mutate user profile
```

**Example: `lib/hooks/useWatchlists.ts`**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/browser-client'

export function useWatchlists(userId?: string) {
  return useQuery({
    queryKey: ['watchlists', userId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('watchlists')
        .select('id, name, description, cover_image_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ watchlistId, anime }) => { /* ... */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
    }
  })
}
```

**Files to modify:**
- `components/WatchlistModal.tsx` - replace fetchWatchlists with useWatchlists
- `app/(pages)/discover/DiscoverClient.tsx` - use React Query for search
- `lib/auth/AuthContext.tsx` - optionally use React Query for profile

### Verification Checkpoint 3
- [ ] `npm run build` passes
- [ ] Watchlist modal loads watchlists correctly
- [ ] Adding anime to watchlist works + updates UI
- [ ] Creating new watchlist works
- [ ] Watchlist data cached (open modal twice - second is instant)
- [ ] Error states display correctly
- [ ] Loading states display correctly

---

## Phase 4: WatchlistModal State Refactor (Medium Risk)

### Problem
17 useState declarations in WatchlistModal.tsx (lines 44-60):
- Hard to track state transitions
- Manual reset logic (9 variables)
- Race conditions possible

### Solution: useReducer with state machine

**Pattern:**
```tsx
type ModalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'selecting'; watchlists: Watchlist[]; selected: Set<string> }
  | { status: 'creating'; form: { name: string; desc: string; isPublic: boolean } }
  | { status: 'adding'; targetIds: string[] }
  | { status: 'success'; watchlistName: string; skipped: string[] }
  | { status: 'error'; message: string; prevStatus: ModalState }

type ModalAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; watchlists: Watchlist[] }
  | { type: 'FETCH_UNAUTHENTICATED' }
  | { type: 'SELECT_WATCHLIST'; id: string }
  | { type: 'DESELECT_WATCHLIST'; id: string }
  | { type: 'START_CREATE' }
  | { type: 'UPDATE_FORM'; field: string; value: any }
  | { type: 'ADD_START' }
  | { type: 'ADD_SUCCESS'; name: string; skipped: string[] }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }
```

**File to modify:** `components/WatchlistModal.tsx`
- Extract reducer to top of file or separate file
- Replace 17 useState with single useReducer
- Dispatch actions instead of multiple setState calls
- Reset becomes `dispatch({ type: 'RESET' })`

### Verification Checkpoint 4
- [ ] `npm run build` passes
- [ ] Modal opens from recommendations page
- [ ] Modal opens from anime detail page
- [ ] Can select multiple watchlists
- [ ] Can create new watchlist
- [ ] Success state shows correctly
- [ ] Error state shows correctly
- [ ] Modal closes and resets properly
- [ ] Back button in modal works
- [ ] Unauthenticated flow works (shows overlay)

---

## Phase 5: AuthContext Cleanup (Low Risk)

### Problem
3 loading-related states: `loading`, `profileLoading`, `profileFetchInProgress`

### Solution: Simplify to clear states

**File:** `lib/auth/AuthContext.tsx`

```tsx
// BEFORE
const [loading, setLoading] = useState(true)
const [profileLoading, setProfileLoading] = useState(false)
const [profileFetchInProgress, setProfileFetchInProgress] = useState(false)

// AFTER
type AuthStatus = 'initializing' | 'unauthenticated' | 'loading_profile' | 'ready'
const [status, setStatus] = useState<AuthStatus>('initializing')

// Derive for backward compat
const loading = status === 'initializing'
const profileLoading = status === 'loading_profile'
```

### Verification Checkpoint 5
- [ ] `npm run build` passes
- [ ] Fresh page load shows loading state briefly then content
- [ ] OAuth login flow works (Google)
- [ ] Email login flow works
- [ ] Sign out works
- [ ] Profile loads after auth
- [ ] Username setup modal shows for new users
- [ ] NavigationBar shows correct auth state

---

## Phase 6: ModalBase Component (Low Risk)

### Problem
8 modal components duplicate backdrop/close/portal logic.

### Solution: Extract reusable ModalBase

**New file:** `components/ui/ModalBase.tsx`
```tsx
interface ModalBaseProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function ModalBase({ isOpen, onClose, children, size = 'md', className }: ModalBaseProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white dark:bg-darkBg rounded-lg ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
```

**Files to migrate (incrementally):**
1. `ReviewModal.tsx` (smallest, good test)
2. `SharePreviewModal.tsx`
3. `EpisodesModal.tsx`
4. `WatchlistModal.tsx` (after Phase 4)
5. Others as needed

### Verification Checkpoint 6
- [ ] `npm run build` passes
- [ ] Review modal opens/closes correctly
- [ ] Backdrop click closes modal
- [ ] ESC key closes modal
- [ ] Body scroll locked when modal open
- [ ] Modal content scrolls if too tall

---

## Phase 6.5: useRecommendations React Query Migration (Medium Risk)

### Problem
`useRecommendations` hook manages complex state with sessionStorage sync manually.

### Solution: Migrate to React Query with custom persistence

**File:** `lib/hooks/useRecommendations.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Persist to sessionStorage
const persister = {
  persistClient: (client) => {
    sessionStorage.setItem('recommendations_cache', JSON.stringify(client))
  },
  restoreClient: () => {
    const cached = sessionStorage.getItem('recommendations_cache')
    return cached ? JSON.parse(cached) : undefined
  }
}

export function useRecommendations(user: User | null) {
  const queryClient = useQueryClient()

  // Restore from sessionStorage on mount
  useEffect(() => {
    const cached = sessionStorage.getItem('recommendations_data')
    if (cached) {
      queryClient.setQueryData(['recommendations'], JSON.parse(cached))
    }
  }, [])

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => [], // Initial empty, populated by mutation
    staleTime: Infinity, // Don't refetch automatically
    initialData: []
  })

  const getRecommendationsMutation = useMutation({
    mutationFn: async ({ description, tags, append }: {
      description: string
      tags: string[]
      append: boolean
    }) => {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        body: JSON.stringify({ description, tags, seenTitles: /* ... */ })
      })
      return response.json()
    },
    onSuccess: (data, { append }) => {
      queryClient.setQueryData(['recommendations'], (old: any[]) => {
        const newRecs = append ? [...old, ...data] : data
        sessionStorage.setItem('recommendations_data', JSON.stringify(newRecs))
        return newRecs
      })
    }
  })

  const clearAll = () => {
    queryClient.setQueryData(['recommendations'], [])
    sessionStorage.removeItem('recommendations_data')
    sessionStorage.removeItem('recommendations_seenTitles')
  }

  return {
    recommendations: recommendationsQuery.data ?? [],
    isLoading: getRecommendationsMutation.isPending,
    error: getRecommendationsMutation.error,
    getRecommendations: getRecommendationsMutation.mutateAsync,
    clearAll
  }
}
```

**File to modify:** `app/HomeClient.tsx`
- Simplify to use new hook API
- Remove manual sessionStorage effects (Phase 7 handles remaining)

### Verification Checkpoint 6.5
- [ ] `npm run build` passes
- [ ] Get recommendations works
- [ ] "See More" appends correctly
- [ ] Clear all works
- [ ] Navigate away and back - recommendations persist
- [ ] Rate limit handling still works
- [ ] Search history tracking still works
- [ ] Recent searches save to localStorage

---

## Phase 7: HomeClient sessionStorage Cleanup (Low Risk)

### Problem
5 separate useEffect hooks for sessionStorage sync (lines 53-145).

### Solution: Custom hook for sessionStorage sync

**New file:** `lib/hooks/useSessionStorage.ts`
```tsx
export function useSessionStorageSync<T>(
  key: string,
  value: T,
  options?: { enabled?: boolean; serialize?: (v: T) => string }
) {
  const { enabled = true, serialize = JSON.stringify } = options ?? {}

  useEffect(() => {
    if (enabled && value !== undefined && value !== null) {
      try {
        sessionStorage.setItem(key, serialize(value))
      } catch (e) {
        console.warn(`Failed to save ${key} to sessionStorage`)
      }
    }
  }, [key, value, enabled, serialize])
}

export function useSessionStorageRestore<T>(
  key: string,
  setter: (value: T) => void,
  options?: { parse?: (s: string) => T }
) {
  const { parse = JSON.parse } = options ?? {}
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    if (restored) return
    try {
      const stored = sessionStorage.getItem(key)
      if (stored) setter(parse(stored))
    } catch (e) {
      console.warn(`Failed to restore ${key} from sessionStorage`)
    }
    setRestored(true)
  }, [key, setter, parse, restored])

  return restored
}
```

**File to modify:** `app/HomeClient.tsx`
- Replace 5 individual sync effects with hook calls
- Consolidate restore logic

### Verification Checkpoint 7
- [ ] `npm run build` passes
- [ ] Get recommendations on home page
- [ ] Navigate away and back - recommendations persist
- [ ] "See More" works after restore
- [ ] Clear all clears sessionStorage
- [ ] Tags/description persist across navigation
- [ ] OAuth flow returns with state preserved

---

## Phase 8: Component Splitting (Future/Optional)

### Lower priority items for later:

1. **AuthModal.tsx (700 lines)** - Split into:
   - `auth/SignInForm.tsx`
   - `auth/SignUpForm.tsx`
   - `auth/ForgotPasswordForm.tsx`
   - `auth/OAuthButtons.tsx`

2. **Unify AnimeCard components** - Create base component for:
   - `AnimeCard.tsx` (recommendations)
   - `DiscoverAnimeCard.tsx` (discover)

3. **Reusable form components**:
   - `ui/Input.tsx`
   - `ui/Textarea.tsx`
   - `ui/Button.tsx`

---

## Implementation Order

| Phase | Task | Risk | Dependencies |
|-------|------|------|--------------|
| 1 | Dark mode flash fix | Low | None |
| 2 | useCurrentUser hook | Low | None |
| 3 | React Query hooks (watchlists) | Medium | Phase 2 |
| 4 | WatchlistModal reducer | Medium | Phase 3 |
| 5 | AuthContext cleanup | Low | None |
| 6 | ModalBase component | Low | None |
| 6.5 | useRecommendations React Query | Medium | Phase 3 |
| 7 | sessionStorage hooks | Low | Phase 6.5 |
| 8 | Component splitting | Low | Phases 4,6 |

**Recommended execution:**
1. Phase 1-2 first (quick wins, immediate UX fix)
2. Phase 3-4 together (watchlist flow)
3. Phase 6.5 (recommendations - most complex, do after watchlist patterns established)
4. Phase 5-7 in any order (cleanup)
5. Phase 8 last (optional polish)

---

## Files Changed Summary

**New files:**
- `lib/hooks/useCurrentUser.ts`
- `lib/hooks/useWatchlists.ts`
- `lib/hooks/useSessionStorage.ts`
- `lib/hooks/useRecommendations.ts` (rewrite)
- `components/ui/ModalBase.tsx`

**Modified files:**
- `app/globals.css` - theme utility classes
- `app/HomeClient.tsx` - dark mode fix, React Query, sessionStorage cleanup
- `components/NavigationBar.tsx` - dark mode fix
- `components/WatchlistModal.tsx` - useReducer, React Query
- `components/AnimeCard.tsx` - useCurrentUser hook
- `components/DiscoverAnimeCard.tsx` - useCurrentUser hook
- `lib/auth/AuthContext.tsx` - status simplification
- `components/ReviewModal.tsx` - migrate to ModalBase
- `components/SharePreviewModal.tsx` - migrate to ModalBase

---

## Testing Strategy

After each phase:
1. Run `npm run build` - catch type errors
2. Manual test affected flows (checkpoints above)
3. Check for console errors
4. Test in both light/dark mode
5. Test on mobile viewport

Critical paths to always verify:
- [ ] Home page loads, recommendations work
- [ ] Discover page search works
- [ ] Add to watchlist flow (auth + unauth)
- [ ] Sign in / sign out
- [ ] Profile creation flow
- [ ] Dark/light mode toggle

---

## Unresolved Questions

1. ~~Should we add keyboard ESC handling to ModalBase?~~ **Yes - included**
2. ~~Should React Query also replace the recommendations fetch?~~ **Yes - Phase 6.5 added**
3. Should we add error boundaries around major sections?
4. Bundle size: should we audit lucide-react imports (barrel vs direct)?
5. Should seenTitles tracking move to server-side to prevent gaming?
