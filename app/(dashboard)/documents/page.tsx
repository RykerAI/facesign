import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus, CheckCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/types";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const docs = (data ?? []) as Document[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 mt-1">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <Link href="/documents/new">
            <Plus size={16} className="mr-2" /> New document
          </Link>
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-16 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">No documents yet</p>
          <p className="text-slate-500 text-sm mt-1">Create a document to start signing with your face</p>
          <Button asChild className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white">
            <Link href="/documents/new">Create document</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  doc.status === "signed" ? "bg-green-500/20" : "bg-indigo-500/20"
                }`}>
                  {doc.status === "signed"
                    ? <CheckCircle size={18} className="text-green-400" />
                    : <Clock size={18} className="text-indigo-400" />
                  }
                </div>
                <div>
                  <p className="text-white font-medium group-hover:text-indigo-300 transition-colors">
                    {doc.title}
                  </p>
                  <p className="text-slate-500 text-sm mt-0.5">
                    {doc.status === "signed" && doc.signed_at
                      ? `Signed ${new Date(doc.signed_at).toLocaleDateString()}`
                      : `Created ${new Date(doc.created_at).toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {doc.signature_method && (
                  <span className="text-xs text-slate-500">via {doc.signature_method}</span>
                )}
                <Badge
                  className={doc.status === "signed"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }
                >
                  {doc.status === "signed" ? "Signed" : "Pending"}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
