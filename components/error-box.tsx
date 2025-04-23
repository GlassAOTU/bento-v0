export default function ErrorBox({ message }: { message: string }) {
    return (
        <div className="bg-red-100 text-red-700 border border-red-300 p-4 rounded-md text-sm">
            {message}
        </div>
    );
}
