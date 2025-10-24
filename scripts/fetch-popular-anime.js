#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function fetchAnimeByCategory(category, count = 4) {
    let query, variables;

    switch (category) {
        case 'most-popular':
            query = `
            query ($perPage: Int) {
              Page(perPage: $perPage) {
                media(type: ANIME, sort: POPULARITY_DESC) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                }
              }
            }`;
            variables = { perPage: count };
            break;

        case 'shonen':
            query = `
            query ($perPage: Int, $genre_in: [String]) {
              Page(perPage: $perPage) {
                media(type: ANIME, genre_in: $genre_in, sort: POPULARITY_DESC) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                }
              }
            }`;
            variables = { perPage: count, genre_in: ['Action'] }; // Using Action as Shounen isn't a genre filter
            break;

        case 'isekai':
            query = `
            query ($perPage: Int, $tag_in: [String]) {
              Page(perPage: $perPage) {
                media(type: ANIME, tag_in: $tag_in, sort: POPULARITY_DESC) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Isekai'] };
            break;

        case 'found-family':
            query = `
            query ($perPage: Int, $tag_in: [String]) {
              Page(perPage: $perPage) {
                media(type: ANIME, tag_in: $tag_in, sort: POPULARITY_DESC) {
                  id
                  title { romaji }
                  coverImage { large }
                  averageScore
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Found Family'] };
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

        return data.data.Page.media.map((anime) => ({
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

async function main() {
    console.log('Fetching anime from AniList...\n');

    const categories = [
        { key: 'mostPopular', name: 'Most Popular', slug: 'most-popular' },
        { key: 'shonen', name: 'Shonen', slug: 'shonen' },
        { key: 'isekai', name: 'Isekai (Slice of Life)', slug: 'isekai' },
        { key: 'foundFamily', name: 'Found Family with No Incest Plotlines', slug: 'found-family' }
    ];

    const result = {};

    for (const category of categories) {
        console.log(`Fetching ${category.name}...`);
        try {
            const anime = await fetchAnimeByCategory(category.slug, 4);
            result[category.key] = anime;
            console.log(`  ✓ Fetched ${anime.length} anime`);
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
