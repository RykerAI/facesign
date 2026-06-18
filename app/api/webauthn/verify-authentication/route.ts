import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN ?? "http://localhost:3000";
const CHALLENGE_COOKIE = "webauthn_login_challenge";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Invalid credential payload" }, { status: 400 });
  }

  const service = await createServiceClient();

  let expectedChallenge: string | null = null;
  let profile: {
    id: string;
    webauthn_credential_id: string | null;
    webauthn_public_key: string | null;
    webauthn_counter: number | null;
    webauthn_transports: string[] | null;
  } | null = null;

  if (user) {
    // Logged-in flow (e.g. document signing): challenge lives in the DB
    const { data: challengeRow } = await service
      .from("webauthn_challenges")
      .select("challenge")
      .eq("user_id", user.id)
      .eq("type", "authentication")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!challengeRow) {
      return NextResponse.json({ error: "No pending challenge" }, { status: 400 });
    }
    expectedChallenge = challengeRow.challenge;

    await service
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "authentication");

    const { data } = await service
      .from("profiles")
      .select("id, webauthn_credential_id, webauthn_public_key, webauthn_counter, webauthn_transports")
      .eq("id", user.id)
      .single();
    profile = data;
  } else {
    // Pre-login flow: challenge was set as an httpOnly cookie by auth-options.
    // Identify the user by the credential ID the authenticator returned.
    expectedChallenge = req.cookies.get(CHALLENGE_COOKIE)?.value ?? null;
    if (!expectedChallenge) {
      return NextResponse.json({ error: "No pending challenge" }, { status: 400 });
    }

    const { data } = await service
      .from("profiles")
      .select("id, webauthn_credential_id, webauthn_public_key, webauthn_counter, webauthn_transports")
      .eq("webauthn_credential_id", body.id)
      .single();
    profile = data;
  }

  if (!profile?.webauthn_credential_id || !profile?.webauthn_public_key) {
    return NextResponse.json({ error: "No registered credential" }, { status: 400 });
  }
  if (!expectedChallenge) {
    return NextResponse.json({ error: "No pending challenge" }, { status: 400 });
  }

  try {
    const publicKeyBuffer = Buffer.from(profile.webauthn_public_key, "base64");

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: profile.webauthn_credential_id,
        publicKey: new Uint8Array(publicKeyBuffer),
        counter: profile.webauthn_counter ?? 0,
        transports: (profile.webauthn_transports as AuthenticatorTransport[]) ?? [],
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ verified: false }, { status: 400 });
    }

    // Update counter to prevent replay attacks
    await service
      .from("profiles")
      .update({ webauthn_counter: verification.authenticationInfo.newCounter })
      .eq("id", profile.id);

    const res = NextResponse.json({ verified: true, userId: profile.id });
    // One-time use: clear the pre-login challenge cookie
    res.cookies.set(CHALLENGE_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
}
