/**
 * ARM (Anime Relations Mapping) API client
 * https://github.com/BeeeQueue/arm-server
 *
 * Community-maintained database mapping anime IDs across services
 */

interface ARMResponse {
  anilist?: number
  mal?: number
  thetvdb?: number
  themoviedb?: number
  kitsu?: number
  anidb?: number
}

const ARM_API_BASE = 'https://arm.haglund.dev/api/v2'
const ARM_TIMEOUT = 5000

export async function getTMDBIdFromARM(anilistId: number): Promise<number | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), ARM_TIMEOUT)

    const response = await fetch(
      `${ARM_API_BASE}/ids?source=anilist&id=${anilistId}`,
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    if (!response.ok) {
      return null
    }

    const data: ARMResponse = await response.json()
    return data.themoviedb || null
  } catch {
    return null
  }
}
