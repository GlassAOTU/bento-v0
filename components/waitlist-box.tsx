'use client'

interface WaitlistProps {
    onDismiss: () => void;
    onJoinWaitlist: () => void;
}

export default function WaitlistBox({ onDismiss, onJoinWaitlist }: WaitlistProps) {
    return (
        <div className="fixed bottom-0 left-0">
            <div className="bg-white p-4 sm:p-8 text-sm mb-8 ml-3 mr-3 text-left shadow-xl rounded-md border border-[#4a4023]/50">
                <button onClick={onDismiss}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z"></path></svg>
                </ button>
                <p>here is a fun way to find a new anime with the help of AI.</p>
                <p className="mb-4">stay tuned as we build out a more personalized experience!</p>
                <div className="flex flex-row gap-4 text-xs sm:text-sm text-[#3c3c3c]">
                    {/* <a href="" className="px-4 py-2 rounded-full  border-2 text-md border-[#4a4023]/50 transition-all">Join the Waitlist</a> */}
                    <button onClick={onJoinWaitlist} className="px-4 py-2 rounded-full  border-2 text-md border-[#4a4023]/50 transition-all">
                        Join the Waitlist
                    </button>

                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSecLWUADxKNFscCTMY52JTaviNy7L3H-0Rg9xzFgM9Lpp_l7w/viewform?usp=dialog" target="blank_" className="px-4 py-2 rounded-full  border text-md border-[#4a4023]/50 transition-all">Leave Feedback</a>
                </div>
            </div>
        </div>
    )
}