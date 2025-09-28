import Image from "next/image"
import Link from "next/link"

export default function Footer() {

    return (
        <main className="w-full items-center p-5">

            {/* <div className="justify-self-start text-4xl font-medium">bento</div> */}

            <div className="justify-center flex flex-row gap-4">

                <Link href="https://x.com/animebento">
                    <Image src="/images/x.svg" width={26} height={26} alt="x logo" />
                </Link>

                <Link href="https://www.instagram.com/bentoxanime">
                    <Image src="/images/instagram.svg" width={24} height={24} alt="instagram logo" />
                </Link>

            </div>

            {/* <div className="justify-self-end text-xl font-medium">a new way to anime</div> */}

        </main>
    )

}