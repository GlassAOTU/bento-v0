'use client'

import { useEffect, useState } from "react";

export default function BottomButton() {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowButton(window.scrollY > 100);  // tune as needed
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        if (typeof window === 'undefined') return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`bg-mySecondary/10 bg-opacity-75 hover:bg-mySecondary/25 hover:bg-opacity-75 border-2 border-opacity-50 border-mySecondary transition-all sticky rounded-md bottom-2 left-1/2 transform -translate-x-1/2 py-2 px-5 z-100
            ${showButton ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide stroke-mySecondary lucide-arrow-up-from-line-icon lucide-arrow-up-from-line"><path d="m18 9-6-6-6 6" /><path d="M12 3v14" /><path d="M5 21h14" /></svg>

        </button>
    );
}
