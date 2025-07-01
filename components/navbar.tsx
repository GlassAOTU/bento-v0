export default function Navbar( {onJoinWaitlist} : any) {
    return (
        <div className="flex justify-center">

        <div className="w-full px-10 m-4 items-center bg-white flex flex-row max-w-5xl justify-between">
            <button onClick={onJoinWaitlist} className="text-sm p-2 rounded-md border border-mySecondary hover:border-mySecondary transition-colors">
                join the waitlist
            </button>
            <div className="flex flex-row gap-12">
                <a href="/" className="font-semibold">
                    recommendations
                </a>
                <a href="/">
                    watchlist
                </a>
                <a href="/">
                    discover
                </a>
            </div>
        </div>
        </div>
    )
}