import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID ?? "localhost";

export async function POST(req: NextRequest) {
  // Auth-options can be called pre-login (no session) with an email hint,
  // or post-login for document signing.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];
  let userId: string | null = user?.id ?? null;

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

  // Store challenge
  if (userId) {
    const service = await createServiceClient();
    await service.from("webauthn_challenges").insert({
      user_id: userId,
      challenge: options.challenge,
      type: "authentication",
    });
  } else {
    // Store in a temp cookie-based way — not needed for pre-login in this build
    // For this implementation, fingerprint sign-in is only available post-login
    return NextResponse.json({ error: "Must be signed in to use fingerprint" }, { status: 401 });
  }

  void req; // suppress unused param warning
  return NextResponse.json(options);
}
