import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const service = await createServiceClient();

  // Retrieve and delete challenge
  const { data: challengeRow } = await service
    .from("webauthn_challenges")
    .select("challenge")
    .eq("user_id", user.id)
    .eq("type", "registration")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!challengeRow) return NextResponse.json({ error: "No pending challenge" }, { status: 400 });

  await service
    .from("webauthn_challenges")
    .delete()
    .eq("user_id", user.id)
    .eq("type", "registration");

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ verified: false }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    await service
      .from("profiles")
      .update({
        webauthn_credential_id: credential.id,
        webauthn_public_key: Buffer.from(credential.publicKey).toString("base64"),
        webauthn_counter: credential.counter,
        webauthn_transports: body.response?.transports ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ verified: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
}
