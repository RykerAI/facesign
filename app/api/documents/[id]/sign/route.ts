import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { method, imageDataUrl } = await req.json();

  // Verify document belongs to user and is still pending
  const { data: doc } = await supabase
    .from("documents")
    .select("id, status, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.status === "signed") return NextResponse.json({ error: "Already signed" }, { status: 400 });

  let signatureFaceUrl: string | null = null;

  // Store face photo if provided (face signing)
  if (imageDataUrl) {
    const res = await fetch(imageDataUrl);
    const blob = await res.blob();
    const filePath = `${user.id}/signatures/${id}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("faces")
      .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from("faces").getPublicUrl(filePath);
      signatureFaceUrl = urlData.publicUrl;
    }
  }

  const { error } = await supabase
    .from("documents")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_method: method,
      signature_face_url: signatureFaceUrl,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
