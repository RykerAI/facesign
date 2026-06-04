import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  const { recipientEmail, recipientName } = parsed.data;

  const [{ data: doc }, { data: profile }] = await Promise.all([
    supabase
      .from("documents")
      .select("title, signed_at, signature_method")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single(),
  ]);

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const signerName = (profile as { full_name?: string } | null)?.full_name ?? "Unknown";
  const signerEmail = (profile as { email?: string } | null)?.email ?? user.email ?? "";
  const signedAt = doc.signed_at
    ? new Date(doc.signed_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : "Unknown";
  const method = doc.signature_method ?? "biometric";

  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  const bodyText = [
    greeting,
    "",
    `This document has been signed by ${signerName} on ${signedAt} using biometric authentication via FaceSign.`,
    "",
    `Document:   ${doc.title}`,
    `Signed by:  ${signerName} (${signerEmail})`,
    `Signed at:  ${signedAt}`,
    `Method:     ${method}`,
    "",
    "Verified by: FaceSign Biometric Platform",
  ].join("\n");

  const subject = encodeURIComponent(`Signed document: ${doc.title}`);
  const encodedBody = encodeURIComponent(bodyText);
  const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${encodedBody}`;

  return NextResponse.json({ mailtoUrl });
}
