import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const public_routes = ["/", "/discover"]; // for non-authenticated users

export function isPublicRoute(request: NextRequest) {
    return public_routes.includes(request.nextUrl.pathname);
}

export async function middleware(request: NextRequest) {
    // update user session if he is authenticated
    const { user, response } = await updateSession(request);

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};