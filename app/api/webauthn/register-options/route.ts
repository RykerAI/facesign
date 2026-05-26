import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? "FaceSign";
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID ?? "localhost";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email ?? user.id,
    userDisplayName: user.email ?? user.id,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  // Store challenge in DB (expires in 5 min via DB default)
  const service = await createServiceClient();
  await service.from("webauthn_challenges").insert({
    user_id: user.id,
    challenge: options.challenge,
    type: "registration",
  });

  return NextResponse.json(options);
}
