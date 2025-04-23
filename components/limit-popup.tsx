export default function LimitPopup({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/80">
            <div className="bg-white shadow-lg rounded-lg p-6 max-w-sm mx-auto">
                <h2 className="text-lg font-semibold text-black">Thank you for trying Bento!</h2>
                <h3>Please sign up for the full release!</h3>
                <p>FORM GOES HERE</p>
                <button
                    onClick={onClose}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
}