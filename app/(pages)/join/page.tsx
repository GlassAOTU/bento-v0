import { signup } from "@/actions/auth/auth";

export default function JoinPage() {
    return (
        <div className="bg-white">

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                {/* Page content */}
                <div className="max-w-5xl flex flex-col mx-auto gap-8">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10 md:mb-10">
                        <div className="relative max-w-[1200px]">
                            {/* <Image
                                src="/images/header-image.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                            />
                            <Image
                                src="/images/header-image-mobile.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="sm:hidden w-full h-auto [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                            /> */}
                        </div>
                    </section>

                    {/* Signup Form Section */}
                    <section className="px-10">
                        <h1 className="text-3xl font-bold mb-6">Join Bento</h1>
                        <p className="mb-6 text-lg">Create your account to get personalized anime recommendations.</p>
                        
                        <form action={signup} className="flex flex-col gap-4 max-w-md">
                            <input 
                                type="email" 
                                name="email" 
                                placeholder="Email" 
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input 
                                type="password" 
                                name="password" 
                                placeholder="Password" 
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                type="submit"
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            >
                                Sign up
                            </button>
                        </form>
                    </section>

                    <div className="px-10">
                        <hr />
                    </div>

                </div>
            </div>

        </div>
    )
}