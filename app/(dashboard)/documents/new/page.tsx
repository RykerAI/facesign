"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import DropZone from "@/components/documents/DropZone";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewDocumentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const contentValue = watch("content");

  async function handleDroppedFile(file: File, textContent?: string) {
    const titleFromFile = file.name.replace(/\.[^/.]+$/, "");
    setValue("title", titleFromFile);

    if (textContent) {
      setValue("content", textContent);
      setUploadedFile(file);
      return;
    }

    // Non-text file (PDF/DOC) — upload via server API route
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/documents/upload", { method: "POST", body: form });
    if (!res.ok) {
      toast.error("Failed to upload file");
      return;
    }
    const { url } = await res.json();
    setFileUrl(url);
    setUploadedFile(file);
    setValue("content", `__file__:${url}`);
    toast.success("File uploaded — sign it with your biometrics");
  }

  async function onSubmit(data: FormData) {
    if (!data.content && !fileUrl) {
      toast.error("Add document content or upload a file");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const content = fileUrl
        ? `__file__:${fileUrl}`
        : (data.content ?? "");

      const { data: doc, error } = await supabase
        .from("documents")
        .insert({ user_id: user.id, title: data.title, content })
        .select()
        .single();
      if (error) throw error;

      toast.success("Document created");
      router.push(`/documents/${doc.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          <Link href="/documents"><ArrowLeft size={16} /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">New document</h1>
          <p className="text-slate-400 text-sm mt-0.5">Upload or write a document to sign with your biometrics</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">

        {/* Drag & Drop Zone */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Upload a document</Label>
          <DropZone onFile={handleDroppedFile} />
          {fileUrl && (
            <p className="text-indigo-400 text-xs">File uploaded — will be displayed when signing</p>
          )}
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-500 text-xs">or write manually</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Document title</Label>
          <Input
            placeholder="e.g. Non-disclosure agreement"
            className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-indigo-500"
            {...register("title")}
          />
          {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
        </div>

        {/* Content */}
        {!fileUrl && (
          <div className="space-y-1.5">
            <Label className="text-slate-300">Document content</Label>
            <Textarea
              rows={14}
              placeholder="Paste or type your document text here…"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-indigo-500 resize-none font-mono text-sm"
              {...register("content")}
            />
            {!contentValue && !fileUrl && (
              <p className="text-slate-500 text-xs">Required if no file is uploaded</p>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {loading && <Loader2 size={16} className="animate-spin mr-2" />}
          Create document
        </Button>
      </form>
    </div>
  );
}
