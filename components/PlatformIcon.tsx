'use client'

import {
    SiNetflix,
    SiCrunchyroll,
    SiAmazonprime,
    SiYoutube,
    SiBilibili,
    SiHbo,
} from 'react-icons/si'
import { HidiveIcon } from './icons/streaming/HidiveIcon'
import { TubiIcon } from './icons/streaming/TubiIcon'
import { PeacockIcon } from './icons/streaming/PeacockIcon'
import { DisneyPlusIcon } from './icons/streaming/DisneyPlusIcon'
import { FunimationIcon } from './icons/streaming/FunimationIcon'
import { VrvIcon } from './icons/streaming/VrvIcon'
import { HuluIcon } from './icons/streaming/HuluIcon'
import { Tv } from 'lucide-react'

interface PlatformIconProps {
    platform: string
    size?: number
    className?: string
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

const PLATFORM_ICONS: Record<string, IconComponent> = {
    'netflix': SiNetflix,
    'crunchyroll': SiCrunchyroll,
    'hulu': HuluIcon,
    'amazon prime video': SiAmazonprime,
    'primevideo': SiAmazonprime,
    'amazon prime': SiAmazonprime,
    'amazon': SiAmazonprime,
    'youtube': SiYoutube,
    'bilibili': SiBilibili,
    'hbo max': SiHbo,
    'hbo': SiHbo,
    'max': SiHbo,
    'hidive': HidiveIcon,
    'tubi': TubiIcon,
    'tubi tv': TubiIcon,
    'peacock': PeacockIcon,
    'disney plus': DisneyPlusIcon,
    'disney+': DisneyPlusIcon,
    'disneyplus': DisneyPlusIcon,
    'funimation': FunimationIcon,
    'vrv': VrvIcon,
}

export function PlatformIcon({ platform, size = 20, className }: PlatformIconProps) {
    const normalizedPlatform = platform.toLowerCase().trim()
    const IconComponent = PLATFORM_ICONS[normalizedPlatform]

    if (IconComponent) {
        return <IconComponent size={size} className={className} />
    }

    return <Tv size={size} className={className} />
}
