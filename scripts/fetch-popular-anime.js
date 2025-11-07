#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function fetchAnimeByCategory(category, count = 20) {
    let query, variables;

    switch (category) {
        case 'most-popular':
            query = `
            query ($perPage: Int, $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE, OVA, ONA]
                ) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                  genres
                  isAdult
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 60 };
            break;

        case 'shonen':
            query = `
            query ($perPage: Int, $tag_in: [String], $genre_not_in: [String], $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  genre_not_in: $genre_not_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE, OVA, ONA]
                ) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                  genres
                  isAdult
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Shounen'], genre_not_in: ['Slice of Life'], scoreMin: 60 };
            break;

        case 'slice-of-life':
            query = `
            query ($perPage: Int, $genre_in: [String], $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  genre_in: $genre_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE, OVA, ONA]
                ) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                  genres
                  isAdult
                }
              }
            }`;
            variables = { perPage: count, genre_in: ['Slice of Life'], scoreMin: 60 };
            break;

        case 'found-family':
            query = `
            query ($perPage: Int, $tag_in: [String], $genre_not_in: [String], $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  genre_not_in: $genre_not_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE, OVA, ONA]
                ) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                  genres
                  isAdult
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Found Family'], genre_not_in: ['Action', 'Adventure'], scoreMin: 60 };
            break;

        case 'top-rated':
            query = `
            query ($perPage: Int, $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  sort: SCORE_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE, OVA, ONA]
                ) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                  genres
                  isAdult
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 60 };
            break;

        default:
            throw new Error(`Unknown category: ${category}`);
    }

    try {
        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`AniList API returned an error: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.data?.Page?.media) {
            throw new Error(`Failed to fetch anime for category: ${category}`);
        }

        return data.data.Page.media
            .filter((anime) => {
                // Additional safety filters
                if (anime.isAdult) return false;
                if (anime.genres?.includes('Hentai')) return false;
                return true;
            })
            .map((anime) => ({
                id: anime.id,
                title: anime.title.romaji,
                image: anime.coverImage.large,
                rating: anime.averageScore
            }));
    } catch (error) {
        console.error(`Error fetching ${category} anime:`, error);
        throw error;
    }
}

async function fetchUniqueAnime(category, mostPopularIds, targetCount = 20) {
    const maxAttempts = 3;
    const batchSize = 30; // Fetch more than needed to account for duplicates
    let allAnime = [];
    let attempt = 0;

    while (allAnime.length < targetCount && attempt < maxAttempts) {
        const fetchCount = batchSize + (attempt * 10); // Fetch more on each attempt
        const anime = await fetchAnimeByCategory(category, fetchCount);

        // Filter out duplicates from Most Popular
        const uniqueAnime = anime.filter(a => !mostPopularIds.has(a.id));

        // Add to our collection (avoiding duplicates within this category too)
        const existingIds = new Set(allAnime.map(a => a.id));
        const newAnime = uniqueAnime.filter(a => !existingIds.has(a.id));
        allAnime = [...allAnime, ...newAnime];

        attempt++;
    }

    return allAnime.slice(0, targetCount);
}

async function main() {
    console.log('Fetching anime from AniList...\n');

    const categories = [
        { key: 'mostPopular', name: 'Most Popular', slug: 'most-popular' },
        { key: 'topRated', name: 'Top Rated', slug: 'top-rated' },
        { key: 'shonen', name: 'Shonen', slug: 'shonen' },
        { key: 'sliceOfLife', name: 'Slice of Life', slug: 'slice-of-life' },
        { key: 'foundFamily', name: 'Found Family with No Incest Plotlines', slug: 'found-family' }
    ];

    const result = {};
    let mostPopularIds = new Set();

    for (const category of categories) {
        console.log(`Fetching ${category.name}...`);
        try {
            let anime;

            if (category.slug === 'most-popular') {
                // Fetch Most Popular first
                anime = await fetchAnimeByCategory(category.slug, 20);
                mostPopularIds = new Set(anime.map(a => a.id));
            } else {
                // For other categories, fetch unique anime
                anime = await fetchUniqueAnime(category.slug, mostPopularIds, 20);
                console.log(`  ℹ Filtered out ${20 - anime.length} duplicates from Most Popular`);
            }

            result[category.key] = anime;
            console.log(`  ✓ Fetched ${anime.length} unique anime`);
            anime.forEach((a, i) => {
                console.log(`    ${i + 1}. ${a.title} (${a.rating}/100)`);
            });
        } catch (error) {
            console.error(`  ✗ Failed to fetch ${category.name}:`, error.message);
            result[category.key] = [];
        }
        console.log('');
    }

    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created public/data directory');
    }

    // Write to JSON file
    const outputPath = path.join(dataDir, 'popular-anime.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify(result, null, 2)
    );

    console.log(`✓ Successfully wrote data to ${outputPath}`);
}

main().catch(error => {
    console.error('Failed to fetch anime:', error);
    process.exit(1);
});
