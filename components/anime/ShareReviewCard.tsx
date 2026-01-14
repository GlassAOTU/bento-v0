'use client'

import { forwardRef } from 'react'
import { truncateText } from '@/lib/utils/screenshot'

interface ShareReviewCardProps {
    animeTitle: string
    bannerDataUrl: string | null
    username: string
    displayName: string | null
    rating: number
    reviewText: string
}

const ShareReviewCard = forwardRef<HTMLDivElement, ShareReviewCardProps>(
    ({ animeTitle, bannerDataUrl, username, displayName, rating, reviewText }, ref) => {
        const truncatedReview = truncateText(reviewText, 280)

        const renderStars = (rating: number) => (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-8 h-8 ${
                            star <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-500 text-gray-500'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                ))}
            </div>
        )

        return (
            <div
                ref={ref}
                style={{
                    width: '1200px',
                    height: '675px',
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                }}
                className="relative overflow-hidden"
            >
                {/* Banner background */}
                {bannerDataUrl ? (
                    <img
                        src={bannerDataUrl}
                        alt=""
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
                        }}
                    />
                )}

                {/* Dark overlay */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.5) 100%)',
                    }}
                />

                {/* Content */}
                <div
                    style={{
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '48px',
                    }}
                >
                    {/* Top - Title and rating */}
                    <div>
                        <h2
                            style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: 'white',
                                marginBottom: '12px',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                lineHeight: 1.3,
                                paddingBottom: '4px',
                            }}
                        >
                            {animeTitle}
                        </h2>
                        {renderStars(rating)}
                    </div>

                    {/* Middle - Review text */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '24px 0' }}>
                        <p
                            style={{
                                fontSize: '28px',
                                color: '#e5e5e5',
                                lineHeight: 1.5,
                                fontStyle: 'italic',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                            }}
                        >
                            "{truncatedReview}"
                        </p>
                    </div>

                    {/* Bottom - User info and branding */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '20px', fontWeight: '500', color: 'white' }}>
                                {displayName || username}
                            </p>
                            <p style={{ color: '#9ca3af' }}>@{username}</p>
                        </div>

                        {/* Branding - Cat logo + bento */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                                src="/images/White Cat.png"
                                alt="Bento"
                                style={{ width: '40px', height: '40px' }}
                            />
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                                bento
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
)

ShareReviewCard.displayName = 'ShareReviewCard'

export default ShareReviewCard
