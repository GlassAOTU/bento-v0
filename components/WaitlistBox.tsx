'use client'

interface WaitlistProps {
    onDismiss: () => void;
    onJoinWaitlist: () => void;
}

export default function WaitlistBox({ onDismiss, onJoinWaitlist }: WaitlistProps) {
    return (
        <div className="fixed bottom-0 left-0 z-10">
            <div className="bg-white dark:bg-darkBg p-4 pt-10 sm:p-8 text-sm mb-8 ml-3 mr-3 text-left shadow-xl relative rounded-md border border-mySecondary/50 dark:border-gray-700">
                <button onClick={onDismiss} className="absolute top-3 right-3 dark:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=""><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </ button>
                <p className="dark:text-gray-300">here is a fun way to find a new anime with the help of AI.</p>
                <p className="mb-4 dark:text-gray-300">stay tuned as we build out a more personalized experience!</p>
                <div className="flex flex-row gap-4 text-xs sm:text-sm text-mySecondary dark:text-gray-300">
                    {/* <a href="" className="px-4 py-2 rounded-full  border-2 text-md border-mySecondary/50 transition-all">Join the Waitlist</a> */}
                    <button onClick={onJoinWaitlist} className="px-4 py-2 rounded-full border-2 text-md border-mySecondary/50 dark:border-gray-600 transition-all hover:border-mySecondary dark:hover:border-gray-400">
                        Join the Waitlist
                    </button>

                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSecLWUADxKNFscCTMY52JTaviNy7L3H-0Rg9xzFgM9Lpp_l7w/viewform?usp=dialog" target="blank_" className="px-4 py-2 rounded-full border text-md border-mySecondary/50 dark:border-gray-600 transition-all hover:border-mySecondary dark:hover:border-gray-400">Leave Feedback</a>
                </div>
            </div>
        </div>
    )
}