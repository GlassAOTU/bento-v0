export default function ErrorBox({ message }: { message: string }) {
    return (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 p-4 rounded-md text-sm">
            {message}
        </div>
    );
}
