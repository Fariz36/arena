import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

const PLAYER_PROTECTED_PREFIXES = ["/dashboard", "/profile", "/history", "/arena"];
const PUBLIC_ONLY_ROUTES = ["/login", "/register"];

function hasPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const loginUrl = new URL("/login", request.url);
  const dashboardUrl = new URL("/dashboard", request.url);
  const unauthorizedUrl = new URL("/unauthorized", request.url);

  if (!user && (hasPrefix(pathname, PLAYER_PROTECTED_PREFIXES) || hasPrefix(pathname, ["/admin"]))) {
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && hasPrefix(pathname, PUBLIC_ONLY_ROUTES)) {
    return NextResponse.redirect(dashboardUrl);
  }

  if (user && hasPrefix(pathname, ["/admin"])) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return response;
}
