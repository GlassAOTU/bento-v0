# Recommendations Plan (Revised)

## Goals
- Return structured recommendations (JSON) instead of fragile string parsing.
- Apply all filtering server-side so the client only renders clean results.
- Enforce max 1 title per franchise (across the full 20), never allow other seasons.
- Treat movies as same-franchise (count toward the 1 cap).
- Exclude prequels/side-stories by default.

## Key Changes
1) **Server JSON output + validation**
- DeepSeek returns JSON array: `[{ title, reason }, ...]`.
- Server parses and validates response; reject malformed output.

2) **Server-side filtering (franchise + season + mentioned anime)**
- Extract mentioned titles (abbreviations + phrases) from description.
- Fetch AniList metadata for candidates to determine relations/format.
- Exclude:
  - Mentioned anime (including abbreviations).
  - Season listings / sequels.
  - Prequels / side stories.
  - Same-franchise entries once 1 title is already accepted.
- Ensure no repeat titles (seenTitles).

3) **Client simplification**
- Client accepts JSON array and fetches details only.
- Remove local season/franchise filtering.

## Implementation Details

### Server: `app/api/recommendations/generate/route.ts`
- Increase model output count to 30, filter down to 20.
- Parse JSON safely, strip code fences if present.
- Extract mentioned anime with normalized matching.
- Call AniList for each candidate to get relations.
- Enforce franchise cap and exclusion rules.
- Return `{ recommendations: Recommendation[], mentionedAnime }`.

### Shared Helpers
- `lib/recommendations/normalizeTitle.ts`
  - Normalize punctuation/case for reliable matching.
- `lib/recommendations/seasonFilter.ts`
  - Shared season detection / base-title extraction.

### Client: `lib/hooks/useRecommendations.ts`
- Expect `data.recommendations` as an array.
- Filter duplicates by normalized title only.
- Use server-provided reasons with fallback text if missing.

## Filtering Rules (Final)
- **Max 1 per franchise** across full 20.
- **No other seasons** ever.
- **Movies count as franchise** (cap still 1).
- **Prequels/side stories excluded** by default.
- **Mentioned titles excluded**, including abbreviations.

## Verification Checklist
1) “like jjk” → no Jujutsu Kaisen (or franchise) entries.
2) “like frieren” → no Frieren entries, no season variants.
3) “like aot” → no Attack on Titan entries (any season).
4) No recommendation list includes more than 1 title from a franchise.
5) All recommendations include non-empty reasons.
6) “See More” still respects full 20 franchise cap.

## Notes / Follow-ups
- If filtering yields <20, re-prompt with blocked titles/franchises.
- If AniList metadata is missing, fall back to base-title heuristics.
