export default function WaitlistPopup({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-darkBg p-8 rounded-lg shadow-lg w-[90%] max-w-md">

                <button onClick={onClose} className="text-right float-right border border-mySecondary/50 dark:border-gray-600 hover:border-mySecondary dark:hover:border-gray-400 rounded-full p-1 transition-colors dark:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=""><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                <h2 className="text-xl mb-4 dark:text-white">Join the Waitlist</h2>

                <form action="https://submit-form.com/akdxwKQgR" target="_blank" className="flex flex-col gap-6">

                    <input
                        type="hidden"
                        name="_redirect"
                        value="https://www.bentoanime.com/"
                    />

                    <div className="flex flex-col">
                        <label htmlFor="name" className="dark:text-white">Name</label>
                        <input type="text" id="name" name="name" placeholder="Name" autoComplete="false" className="text-sm px-2 py-1.5 rounded-md border border-mySecondary/50 dark:border-gray-600 focus:outline-none focus:border-mySecondary dark:focus:border-gray-400 hover:border-mySecondary dark:hover:border-gray-400 transition-colors bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500" required />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="email" className="dark:text-white">E-Mail</label>
                        <input type="text" id="email" name="email" placeholder="user@domain.com" autoComplete="false" className="text-sm px-2 py-1.5 rounded-md border border-mySecondary/50 dark:border-gray-600 focus:outline-none focus:border-mySecondary dark:focus:border-gray-400 hover:border-mySecondary dark:hover:border-gray-400 transition-colors bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500" required />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="message" className="dark:text-white">Message</label>
                        <textarea name="message" id="message" placeholder="Any comments..." autoComplete="false" className="text-sm px-2 py-1.5 rounded-md border border-mySecondary/50 dark:border-gray-600 focus:outline-none focus:border-mySecondary dark:focus:border-gray-400 hover:border-mySecondary dark:hover:border-gray-400 transition-colors resize-none bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500" required></textarea>
                    </div>

                    <button formTarget="" className="w-full bg-mySecondary hover:bg-[#2b2b2b] text-white p-2 rounded-lg transition-colors">Submit</button>
                </form>

            </div>
        </div>
    );
}
