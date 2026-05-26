import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const service = await createServiceClient();

  // Retrieve challenge
  const { data: challengeRow } = await service
    .from("webauthn_challenges")
    .select("challenge")
    .eq("user_id", user.id)
    .eq("type", "authentication")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!challengeRow) return NextResponse.json({ error: "No pending challenge" }, { status: 400 });

  await service
    .from("webauthn_challenges")
    .delete()
    .eq("user_id", user.id)
    .eq("type", "authentication");

  // Load stored credential
  const { data: profile } = await service
    .from("profiles")
    .select("webauthn_credential_id, webauthn_public_key, webauthn_counter, webauthn_transports")
    .eq("id", user.id)
    .single();

  if (!profile?.webauthn_credential_id || !profile?.webauthn_public_key) {
    return NextResponse.json({ error: "No registered credential" }, { status: 400 });
  }

  try {
    const publicKeyBuffer = Buffer.from(profile.webauthn_public_key, "base64");

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
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
      .eq("id", user.id);

    return NextResponse.json({ verified: true, userId: user.id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
}
