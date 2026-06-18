import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID ?? "localhost";
const CHALLENGE_COOKIE = "webauthn_login_challenge";

export async function POST(req: NextRequest) {
  // Auth-options can be called pre-login (no session) for biometric sign-in,
  // or post-login for document signing.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];
  const userId: string | null = user?.id ?? null;

  // If already signed in, load their stored credential
  if (userId) {
    const service = await createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("webauthn_credential_id, webauthn_transports")
      .eq("id", userId)
      .single();

    if (profile?.webauthn_credential_id) {
      allowCredentials = [{
        id: profile.webauthn_credential_id,
        transports: profile.webauthn_transports ?? [],
      }];
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  if (userId) {
    // Logged-in flow: store challenge in the DB keyed to the user
    const service = await createServiceClient();
    await service.from("webauthn_challenges").insert({
      user_id: userId,
      challenge: options.challenge,
      type: "authentication",
    });
    return NextResponse.json(options);
  }

  // Pre-login flow: no user yet, so store the challenge in a short-lived
  // httpOnly cookie. verify-authentication reads it back and identifies the
  // user by the credential ID the authenticator returns.
  void req;
  const res = NextResponse.json(options);
  res.cookies.set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 300,
    path: "/",
  });
  return res;
}
