# Bento Anime

Anime discovery + watchlist platform built with Next.js 15 and Supabase.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Auth/DB**: Supabase (auth + postgres + RLS)
- **Styling**: Tailwind CSS + tailwindcss-animate
- **Analytics**: PostHog + Vercel Analytics
- **APIs**: AniList (anime data), TMDB (images/videos), OpenAI (descriptions)

## Project Structure

```
app/
├── (pages)/              # Route groups
│   ├── discover/         # Browse anime
│   └── watchlists/       # User's watchlists management
├── [username]/           # Public profile at /{username}
│   └── [watchlist]/      # Watchlist page at /{username}/{watchlist-slug}
├── anime/[slug]/         # Anime detail page
├── api/                  # API routes
│   ├── profile/          # Profile CRUD
│   ├── follows/          # Follow system
│   ├── reviews/          # Review system
│   ├── watchlists/       # Watchlist APIs
│   │   ├── [id]/         # Watchlist by ID
│   │   └── user/[username]/[slug]/ # Get watchlist by slug
│   └── anime/            # Anime data APIs
└── auth/                 # Auth callbacks

components/               # React components
lib/
├── supabase/            # Supabase clients (browser/server/service)
├── auth/                # AuthContext provider
├── anilist.ts           # AniList API
├── tmdb.ts              # TMDB API
└── utils/               # Helpers (slugify, localStorage)

supabase/migrations/     # Database migrations (run manually)
```

## Routes

| Route | Description |
|-------|-------------|
| `/{username}` | Public profile page |
| `/{username}/{watchlist-slug}` | Individual watchlist page |
| `/watchlists` | User's own watchlists (requires auth) |
| `/discover` | Browse anime |
| `/anime/{slug}` | Anime detail page |

## Reserved Usernames

These cannot be claimed as usernames:
`discover, watchlists, anime, api, auth, profile, settings, admin, help, about, terms, privacy, login, signup, register, signout, logout, search, explore, home, feed, notifications, messages, user`

## Supabase Clients

- `lib/supabase/browser-client.ts` - Client components
- `lib/supabase/server-client.ts` - Server components/API routes
- `lib/supabase/service-client.ts` - Admin operations (bypasses RLS)

## Database Tables

| Table | Purpose |
|-------|---------|
| `anime_data` | Cached anime info from AniList |
| `watchlists` | User watchlists (has `is_public`, `slug` fields) |
| `watchlist_items` | Anime in watchlists |
| `profiles` | User public profiles |
| `follows` | Follower/following relationships |
| `reviews` | Anime reviews (1-5 rating + text) |

All tables have RLS enabled. Users can only modify their own data.

## Auth Flow

1. User signs in via Supabase Auth (OAuth/email)
2. `AuthProvider` wraps app, provides `useAuth()` hook
3. New users see `UsernameSetupModal` to claim username
4. Profile stored in `profiles` table

## Key Patterns

### API Routes
```typescript
import { createClient } from '@/lib/supabase/server-client'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // ... handle request
}
```

### Client Components
```typescript
'use client'
import { createClient } from '@/lib/supabase/browser-client'
import { useAuth } from '@/lib/auth/AuthContext'

function Component() {
    const { user, profile, loading } = useAuth()
    const supabase = createClient()
    // ...
}
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

## Conventions

- Use `slugify()` from `lib/utils/slugify.ts` for URL slugs
- API errors return `{ error: string }` with appropriate status codes
- Username format: 3-20 chars, lowercase alphanumeric + underscore/hyphen
- Watchlist slugs are auto-generated from name using `slugify()`
- Component props use TypeScript interfaces
- No semicolons in TypeScript (project style)
