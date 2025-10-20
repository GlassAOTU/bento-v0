import NavigationBar from "@/components/NavigationBar";
import Image from "next/image";
import ChangePasswordForm from '@/components/ChangePasswordForm';
import SignOutButton from '@/components/SignOutButton';
import { createClient } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';

export default async function AccountPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    return (
        <main className="bg-white">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">

                <div className="max-w-5xl flex flex-col mx-auto gap-8">
                    <section className="flex justify-center sm:px-10 md:mb-10">
                        <div className="relative max-w-[1200px]">
                            <Image
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
                            />
                        </div>
                    </section>

                    <section>
                        <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <ChangePasswordForm />
                            </div>
                            <div className="flex items-start">
                                <div className="w-full p-4 bg-white rounded-md border shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4">Account</h3>
                                    <p className="text-sm mb-4">Manage your account settings and sign out.</p>
                                    <SignOutButton />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    )
}