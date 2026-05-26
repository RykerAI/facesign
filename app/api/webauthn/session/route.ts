import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body?.userId;

    if (typeof userId !== "string" || userId.length === 0) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const service = await createServiceClient();

    const { data: userData, error: userError } =
      await service.auth.admin.getUserById(userId);

    const user = userData?.user;
    if (userError || !user) {
      return NextResponse.json(
        { error: userError?.message ?? "User not found" },
        { status: userError ? 400 : 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "User does not have an email address" },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const redirectTo = `${siteUrl}/dashboard`;

    // Generate a magic link token hash; the client will immediately verify it via
    // `supabase.auth.verifyOtp({ token_hash, type: 'email' })` to establish a session.
    const { data: linkData, error: linkError } =
      await service.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: { redirectTo },
      });

    const token = linkData?.properties?.hashed_token;
    if (linkError || !token) {
      return NextResponse.json(
        { error: linkError?.message ?? "Could not generate session token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token, userId: user.id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Session exchange failed" },
      { status: 400 }
    );
  }
}

