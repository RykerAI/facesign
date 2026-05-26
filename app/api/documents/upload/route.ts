import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const filePath = `${user.id}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const service = await createServiceClient();
  const { error } = await service.storage
    .from("documents")
    .upload(filePath, bytes, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = service.storage.from("documents").getPublicUrl(filePath);
  return NextResponse.json({ url: urlData.publicUrl, path: filePath });
}
