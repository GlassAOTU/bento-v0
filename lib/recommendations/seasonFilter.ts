function hasTrailingNumberInName(title: string): boolean {
    if (/^\d+/.test(title)) return true;

    const trailingNumberMatch = title.match(/\s+(\d+)$/);
    if (trailingNumberMatch) {
        const num = parseInt(trailingNumberMatch[1], 10);
        if (num > 10 || num === 0) return true;
    }

    const nameNumberPatterns = [
        /No\.\s*\d+$/i,
        /No\s+\d+$/i,
        /Number\s+\d+$/i,
        /#\d+$/,
    ];

    for (const pattern of nameNumberPatterns) {
        if (pattern.test(title)) return true;
    }

    return false;
}

export function extractBaseName(title: string): string {
    let baseName = title;

    if (!hasTrailingNumberInName(title)) {
        baseName = baseName.replace(/\s+\d+$/, "");
    }
    baseName = baseName.replace(/\s+[IVX]+$/i, "");
    baseName = baseName.replace(/\s+Season\s+\d+/i, "");
    baseName = baseName.replace(/\s+S\d+$/i, "");
    baseName = baseName.replace(/\s+\d+(st|nd|rd|th)\s+Season/i, "");
    baseName = baseName.replace(/\s+Part\s+\d+/i, "");
    baseName = baseName.replace(/\s+Cour\s+\d+/i, "");
    baseName = baseName.replace(/:\s*The\s+(Final|Second|Third|Fourth|Fifth)\s+Season$/i, "");
    baseName = baseName.replace(/:\s*Season\s+\d+$/i, "");
    baseName = baseName.replace(/:\s*\d+(st|nd|rd|th)\s+Season$/i, "");
    baseName = baseName.replace(/:\s*Part\s+\d+$/i, "");
    baseName = baseName.replace(/:\s*(Final|Second|Third|Fourth|Fifth)\s+Season$/i, "");
    baseName = baseName.replace(/\s*\(TV\)$/i, "");
    baseName = baseName.replace(/:\s*The\s+Final$/i, "");
    baseName = baseName.replace(/:\s*Final$/i, "");

    return baseName.trim();
}

export function isSeasonListing(title: string): boolean {
    const seasonPatterns = [
        /\s+Season\s*\d+/i,
        /\s+S\d+$/i,
        /\s+\d+(st|nd|rd|th)\s+Season/i,
        /:\s*The\s+(Final|Second|Third|Fourth|Fifth|Last)\s+Season/i,
        /:\s*(Final|Second|Third|Fourth|Fifth|Last)\s+Season/i,
        /:\s*The\s+Final$/i,
        /:\s*Final$/i,
        /\s+Part\s+\d+/i,
        /:\s*Part\s+\d+/i,
        /\s+Cour\s+\d+/i,
        /\s+II+$/i,
        /\s+IV$/i,
        /\s+V$/i,
        /\s+VI+$/i,
        /\s+IX$/i,
        /\s+X$/i,
        /:\s*\w+\s+Arc$/i,
        /:\s*\w+\s+Arc\s+\d+$/i,
        /\s+Movie\s+\d+/i,
        /:\s*Movie\s+\d+/i,
        /第\s*\d+\s*期/,
    ];

    for (const pattern of seasonPatterns) {
        if (pattern.test(title)) {
            return true;
        }
    }

    if (/\s+\d+$/.test(title) && !hasTrailingNumberInName(title)) {
        const baseName = extractBaseName(title);
        if (baseName !== title && baseName.length > 0) {
            return true;
        }
    }

    return false;
}
