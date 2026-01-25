# Recommendations Fix Plan

## Problem Summary

1. **Same anime returned**: Searching "like jjk" or "frieren" returns that anime in recommendations
2. **Abbreviations not filtered**: AI interprets "jjk" → "Jujutsu Kaisen" but still includes it
3. **Season detection too loose**: Should block "AoT Final Season" but allow "Steins;Gate 0"
4. **Description/reason display**: Ensure 1-2 sentence relevance reason always shows

## Root Cause Analysis

### Issue 1: No hard filtering of mentioned anime
- Current: Relies on AI prompt instruction + empty `seenTitles` on first call
- AI is unreliable - may still return mentioned anime
- `seenTitles` filtering only works for subsequent "See More" calls

### Issue 2: Abbreviation interpretation doesn't inform filtering
- DeepSeek interprets "jjk" → "Jujutsu Kaisen" internally
- But client has no knowledge of this interpretation
- Can't filter what it doesn't know about

### Issue 3: `isSeasonListing()` logic
- Currently handles many season patterns correctly
- "Steins;Gate 0" is allowed (0 considered part of title)
- "AoT: The Final Season" is blocked correctly
- May need refinement for edge cases

---

## Implementation Plan

### Phase 1: Server-side - Extract & Return Mentioned Anime

**File:** `app/api/recommendations/generate/route.ts`

1. Create abbreviation map at top of file:
```typescript
const ABBREVIATION_MAP: Record<string, string> = {
    'jjk': 'Jujutsu Kaisen',
    'aot': 'Attack on Titan',
    'snk': 'Attack on Titan',
    'dbz': 'Dragon Ball Z',
    'mha': 'My Hero Academia',
    'bnha': 'My Hero Academia',
    'opm': 'One Punch Man',
    'fmab': 'Fullmetal Alchemist: Brotherhood',
    'fma': 'Fullmetal Alchemist',
    'hxh': 'Hunter x Hunter',
    'kny': 'Demon Slayer',
    'cote': 'Classroom of the Elite',
    'sao': 'Sword Art Online',
    're:zero': 'Re:Zero',
    'rezero': 'Re:Zero',
    'yyh': 'Yu Yu Hakusho',
    'csm': 'Chainsaw Man',
    'ds': 'Demon Slayer',
    'bc': 'Black Clover',
    'op': 'One Piece',
    'naruto': 'Naruto',
    'bleach': 'Bleach',
    'dn': 'Death Note',
    'aob': 'Angel of Death',
    'mob': 'Mob Psycho 100',
    'tte': 'That Time I Got Reincarnated as a Slime',
    'slime': 'That Time I Got Reincarnated as a Slime',
    'konosuba': 'KonoSuba',
    'frieren': 'Frieren: Beyond Journey\'s End',
    'spy x family': 'Spy x Family',
    'spyxfamily': 'Spy x Family'
}
```

2. Add function to extract mentioned anime from description:
```typescript
function extractMentionedAnime(description: string): string[] {
    const mentioned: string[] = []
    const lowerDesc = description.toLowerCase()

    // Check for abbreviations
    for (const [abbr, fullTitle] of Object.entries(ABBREVIATION_MAP)) {
        if (lowerDesc.includes(abbr.toLowerCase())) {
            mentioned.push(fullTitle)
        }
    }

    // Check for common phrases indicating the user likes an anime
    // "like X", "similar to X", "enjoyed X", "loved X", "want more X"
    const patterns = [
        /(?:like|similar to|enjoyed|loved|want more|fans of|if you like)\s+["']?([^"',.\n]+)["']?/gi
    ]

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(description)) !== null) {
            const title = match[1].trim()
            if (title.length > 2 && title.length < 100) {
                mentioned.push(title)
            }
        }
    }

    return [...new Set(mentioned)] // dedupe
}
```

3. Update API response to include `mentionedAnime`:
```typescript
return NextResponse.json({
    recommendations: reply,
    mentionedAnime: extractMentionedAnime(description)
})
```

4. Update prompt to explicitly NOT include mentioned anime:
```
CRITICAL: The user mentioned these anime in their description: ${mentionedAnime.join(', ')}.
Do NOT include ANY of these in your recommendations, including alternate titles or seasons.
```

### Phase 2: Client-side - Filter Using Mentioned Anime

**File:** `lib/hooks/useRecommendations.ts`

1. Update response parsing to receive `mentionedAnime`:
```typescript
const data = await response.json()
const mentionedAnime: string[] = data.mentionedAnime || []
```

2. Add helper function to check if a title matches mentioned anime:
```typescript
function isMentionedAnime(title: string, mentionedList: string[]): boolean {
    const normalizedTitle = title.toLowerCase().trim()

    for (const mentioned of mentionedList) {
        const normalizedMentioned = mentioned.toLowerCase().trim()

        // Exact match
        if (normalizedTitle === normalizedMentioned) return true

        // Title contains mentioned (handles "Jujutsu Kaisen 0" matching "Jujutsu Kaisen")
        // But be careful not to be too aggressive
        if (normalizedTitle.startsWith(normalizedMentioned + ' ') ||
            normalizedTitle.startsWith(normalizedMentioned + ':')) {
            // Check if it's just a season/part, not a spinoff
            const remainder = normalizedTitle.slice(normalizedMentioned.length)
            if (isSeasonIndicator(remainder)) return true
        }

        // Mentioned contains title (handles abbreviations)
        if (normalizedMentioned.includes(normalizedTitle)) return true
    }

    return false
}

function isSeasonIndicator(text: string): boolean {
    const seasonPatterns = [
        /^\s*season\s*\d+/i,
        /^\s*s\d+/i,
        /^\s*part\s*\d+/i,
        /^\s*:\s*the\s+(final|second|third)/i,
        /^\s*:\s*final/i,
        /^\s*\d+(st|nd|rd|th)\s+season/i
    ]
    return seasonPatterns.some(p => p.test(text))
}
```

3. Add filtering step after parsing recommendations:
```typescript
for (const rec of rawRecs) {
    const [rawTitle, reason] = rec.split(" ~ ")
    const title = rawTitle.replace(/^"(.*)"$/, "$1").trim()

    if (!title) continue
    if (newSeenTitles.includes(title)) continue
    if (isSeasonListing(title)) continue
    if (isMentionedAnime(title, mentionedAnime)) continue  // NEW

    parsedRecs.push({ title, reason: reason?.trim() || "No reason provided" })
}
```

### Phase 3: Improve Season/Spinoff Detection

**File:** `lib/anilist-enhanced.ts`

1. Add explicit spinoff whitelist patterns:
```typescript
function isLegitimateSpinoff(title: string): boolean {
    const spinoffPatterns = [
        /0$/,                    // Steins;Gate 0
        /Zero$/i,               // Re:Zero, Fate/Zero
        /Origin$/i,             // Title: Origin
        /Alternative$/i,        // Title Alternative
        /Side\s+Story$/i,       // Side Story
        /Another\s+Story$/i,
        /Prologue$/i,
        /Prequel$/i,
    ]
    return spinoffPatterns.some(p => p.test(title))
}
```

2. Update `isSeasonListing()` to check spinoff whitelist first:
```typescript
export function isSeasonListing(title: string): boolean {
    // Allow legitimate spinoffs/prequels even if they match some patterns
    if (isLegitimateSpinoff(title)) {
        return false
    }
    // ... rest of existing logic
}
```

### Phase 4: Ensure Reason Always Displays

**File:** `lib/hooks/useRecommendations.ts`

1. Improve reason parsing with fallback:
```typescript
const [rawTitle, reason] = rec.split(" ~ ")
const title = rawTitle.replace(/^"(.*)"$/, "$1").trim()

let finalReason = reason?.trim()
if (!finalReason || finalReason === "No reason provided" || finalReason.length < 10) {
    finalReason = `Recommended based on your interest in similar anime`
}

parsedRecs.push({ title, reason: finalReason })
```

2. Validate recommendation output format more strictly:
```typescript
// If no valid recommendations parsed, log warning
if (parsedRecs.length === 0) {
    console.warn('[useRecommendations] No valid recommendations parsed from:', data.recommendations)
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/api/recommendations/generate/route.ts` | Add abbreviation map, extract mentioned anime, return in response, update prompt |
| `lib/hooks/useRecommendations.ts` | Add filtering for mentioned anime, improve reason fallback |
| `lib/anilist-enhanced.ts` | Add spinoff whitelist, refine `isSeasonListing()` |

---

## Verification

1. Test: Search "like jjk" → should NOT return Jujutsu Kaisen
2. Test: Search "like frieren" → should NOT return Frieren
3. Test: Search "like aot" → should NOT return Attack on Titan or its seasons
4. Test: Search "like steins gate" → MAY return Steins;Gate 0 (legitimate spinoff)
5. Test: All recommendations should have non-empty reason field
6. Test: "See More" should not return any previously shown anime

---

### Phase 5: Performance Optimization

**Current bottleneck identified:**
- Lines 201-219 in `useRecommendations.ts` run SEQUENTIALLY
- For 7 recommendations: 7 AniList calls + 7 TMDB calls = 14 sequential API calls
- Each call ~200-500ms = 3-7 seconds just for fetching details

**File:** `lib/hooks/useRecommendations.ts`

1. Parallelize detail fetching with `Promise.all`:
```typescript
// Instead of sequential for-loop:
const detailPromises = toDisplay.map(async ({ title, reason }) => {
    try {
        const [anilistData, tmdbImage] = await Promise.all([
            fetchAnimeDetails(title),
            getTMDBImage(title)
        ])

        return {
            title,
            reason,
            description: anilistData.description,
            image: tmdbImage || anilistData.bannerImage,
            externalLinks: anilistData.externalLinks,
            trailer: anilistData.trailer
        }
    } catch (e) {
        console.warn(`[useRecommendations] Failed to fetch details for: ${title}`, e)
        return null
    }
})

const results = await Promise.all(detailPromises)
const animeFinish = results.filter((r): r is AnimeRecommendation => r !== null)
```

2. Also parallelize in the cache-fetch path (lines 93-111):
```typescript
// Same pattern for cached recommendations
const detailPromises = toDisplay.map(async ({ title, reason }) => {
    // ... same parallel fetch logic
})
```

**Estimated improvement:**
- Before: ~3-7 seconds (14 sequential calls)
- After: ~500-1000ms (all calls in parallel)

**Additional optimizations (optional, lower priority):**

3. **Progressive loading** - show recommendations as they load:
```typescript
// Stream results to UI as each completes
for await (const result of detailPromises) {
    if (result) {
        setRecommendations(prev => [...prev, result])
    }
}
```

4. **Cache AniList responses** - many anime get recommended repeatedly:
```typescript
const anilistCache = new Map<string, AnilistData>()

async function fetchAnimeDetailsCached(title: string) {
    if (anilistCache.has(title)) return anilistCache.get(title)!
    const data = await fetchAnimeDetails(title)
    anilistCache.set(title, data)
    return data
}
```

5. **Batch TMDB requests** - if TMDB API supports it (may not):
- Could reduce 7 TMDB calls to 1 batch request

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/api/recommendations/generate/route.ts` | Add abbreviation map, extract mentioned anime, return in response, update prompt |
| `lib/hooks/useRecommendations.ts` | Add filtering for mentioned anime, improve reason fallback, **parallelize API calls** |
| `lib/anilist-enhanced.ts` | Add spinoff whitelist, refine `isSeasonListing()` |

---

## Verification

1. Test: Search "like jjk" → should NOT return Jujutsu Kaisen
2. Test: Search "like frieren" → should NOT return Frieren
3. Test: Search "like aot" → should NOT return Attack on Titan or its seasons
4. Test: Search "like steins gate" → MAY return Steins;Gate 0 (legitimate spinoff)
5. Test: All recommendations should have non-empty reason field
6. Test: "See More" should not return any previously shown anime
7. **Test: Initial recommendation load < 2 seconds** (down from 3-7s)

---

## Open Questions

None - requirements are clear. Ready for implementation.
