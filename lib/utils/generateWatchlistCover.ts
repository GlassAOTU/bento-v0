import sharp from 'sharp'

const CANVAS_WIDTH = 2174
const CANVAS_HEIGHT = 1300
const CARD_WIDTH = 750
const CARD_HEIGHT = 850
const BORDER_RADIUS = 60
const BORDER_WIDTH = 8

interface CardPosition {
    x: number
    y: number
    rotate: number
    zIndex: number
}

const CARD_POSITIONS: CardPosition[] = [
    { x: 650, y: 640, rotate: -12, zIndex: 1 },
    { x: 1087, y: 760, rotate: 0, zIndex: 3 },
    { x: 1524, y: 640, rotate: 12, zIndex: 2 },
]

async function fetchImage(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${url}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
}

function createRoundedCornersMask(width: number, height: number, radius: number): Buffer {
    const svg = `
        <svg width="${width}" height="${height}">
            <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
        </svg>
    `
    return Buffer.from(svg)
}

async function processCard(imageUrl: string, position: CardPosition): Promise<{ input: Buffer; left: number; top: number }> {
    const imageBuffer = await fetchImage(imageUrl)

    const resized = await sharp(imageBuffer)
        .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
        .toBuffer()

    const mask = createRoundedCornersMask(CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS)
    const rounded = await sharp(resized)
        .composite([{
            input: mask,
            blend: 'dest-in'
        }])
        .png()
        .toBuffer()

    const borderedWidth = CARD_WIDTH + BORDER_WIDTH * 2
    const borderedHeight = CARD_HEIGHT + BORDER_WIDTH * 2
    const whiteBorderMask = createRoundedCornersMask(borderedWidth, borderedHeight, BORDER_RADIUS + BORDER_WIDTH)
    const withBorder = await sharp({
        create: {
            width: borderedWidth,
            height: borderedHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    })
        .composite([
            { input: whiteBorderMask, blend: 'dest-in' },
            { input: rounded, left: BORDER_WIDTH, top: BORDER_WIDTH }
        ])
        .png()
        .toBuffer()

    const shadowPadding = 50
    const rotatedWidth = borderedWidth + shadowPadding * 2
    const rotatedHeight = borderedHeight + shadowPadding * 2

    const withShadow = await sharp({
        create: {
            width: rotatedWidth,
            height: rotatedHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite([
            {
                input: await sharp({
                    create: {
                        width: borderedWidth + 4,
                        height: borderedHeight + 4,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0.12 }
                    }
                })
                    .blur(6)
                    .composite([{
                        input: createRoundedCornersMask(borderedWidth + 4, borderedHeight + 4, BORDER_RADIUS + BORDER_WIDTH + 2),
                        blend: 'dest-in'
                    }])
                    .png()
                    .toBuffer(),
                left: shadowPadding - 2,
                top: shadowPadding + 3
            },
            {
                input: withBorder,
                left: shadowPadding,
                top: shadowPadding
            }
        ])
        .png()
        .toBuffer()

    let finalCard = withShadow
    if (position.rotate !== 0) {
        finalCard = await sharp(withShadow)
            .rotate(position.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer()
    }

    const metadata = await sharp(finalCard).metadata()
    const cardCenterX = position.x
    const cardCenterY = position.y
    const left = Math.round(cardCenterX - (metadata.width || rotatedWidth) / 2)
    const top = Math.round(cardCenterY - (metadata.height || rotatedHeight) / 2)

    return { input: finalCard, left, top }
}

export async function generateWatchlistCover(imageUrls: string[]): Promise<Buffer> {
    if (imageUrls.length < 3) {
        throw new Error('Need at least 3 images to generate cover')
    }

    const cards = await Promise.all(
        imageUrls.slice(0, 3).map((url, index) =>
            processCard(url, CARD_POSITIONS[index])
        )
    )

    const sortedCards = [...cards].sort((a, b) => {
        const aIndex = cards.indexOf(a)
        const bIndex = cards.indexOf(b)
        return CARD_POSITIONS[aIndex].zIndex - CARD_POSITIONS[bIndex].zIndex
    })

    const grayBgWidth = 1900
    const grayBgHeight = 850
    const grayBgRadius = 45
    const grayBgMask = createRoundedCornersMask(grayBgWidth, grayBgHeight, grayBgRadius)
    const grayBackground = await sharp({
        create: {
            width: grayBgWidth,
            height: grayBgHeight,
            channels: 4,
            background: { r: 235, g: 235, b: 235, alpha: 1 }
        }
    })
        .composite([{ input: grayBgMask, blend: 'dest-in' }])
        .png()
        .toBuffer()

    const composite = await sharp({
        create: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite([
            { input: grayBackground, left: Math.round((CANVAS_WIDTH - grayBgWidth) / 2), top: 400 },
            ...sortedCards
        ])
        .png()
        .toBuffer()

    return composite
}
