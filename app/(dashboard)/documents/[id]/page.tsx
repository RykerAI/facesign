import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentSigner } from "@/components/documents/DocumentSigner";
import type { Document } from "@/types";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: docData }, { data: profileData }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("profiles").select("face_descriptor, face_image_url, liveness_verified, webauthn_credential_id, full_name, email").eq("id", user.id).single(),
  ]);

  if (!docData) notFound();

  const doc = docData as Document;
  const profile = profileData;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          <Link href="/documents"><ArrowLeft size={16} /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
            <Badge className={doc.status === "signed"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }>
              {doc.status === "signed" ? "Signed" : "Pending"}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Created {new Date(doc.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Document content */}
      {doc.content.startsWith("__file__:") ? (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10">
            <span className="text-slate-400 text-xs">Uploaded document</span>
          </div>
          <iframe
            src={doc.content.replace("__file__:", "")}
            className="w-full h-[600px]"
            title={doc.title}
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {doc.content}
          </pre>
        </div>
      )}

      {/* Signature status */}
      {doc.status === "signed" ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle className="text-green-400 w-8 h-8 shrink-0" />
          <div>
            <p className="text-green-400 font-semibold">Document signed</p>
            <p className="text-green-400/70 text-sm mt-0.5">
              Signed on {doc.signed_at ? new Date(doc.signed_at).toLocaleString() : "—"}
              {doc.signature_method ? ` via ${doc.signature_method}` : ""}
            </p>
          </div>
          {doc.signature_face_url && (
            <div className="ml-auto shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.signature_face_url}
                alt="Signature selfie"
                className="w-16 h-16 rounded-full object-cover border-2 border-green-500/40"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-slate-400" size={16} />
            <p className="text-white font-semibold">Sign this document</p>
          </div>

          {!profile?.liveness_verified ? (
            <div className="text-center py-6">
              <p className="text-slate-400">You need to enroll your biometrics before signing</p>
              <Button asChild size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white">
                <Link href="/onboarding">Complete biometric setup</Link>
              </Button>
            </div>
          ) : (
            <DocumentSigner
              documentId={doc.id}
              faceDescriptor={profile.face_descriptor}
              faceImageUrl={profile.face_image_url}
              hasWebauthn={!!profile.webauthn_credential_id}
              signerName={(profile as { full_name?: string | null }).full_name ?? ""}
              signerEmail={(profile as { email?: string | null }).email ?? ""}
              documentTitle={doc.title}
            />
          )}
        </div>
      )}
    </div>
  );
}
