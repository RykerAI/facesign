"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

interface Props {
  onFile: (file: File, textContent?: string) => void;
}


export default function DropZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFile(file: File) {
    setSelectedFile(file);
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => onFile(file, e.target?.result as string);
      reader.readAsText(file);
    } else {
      onFile(file, undefined);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          dragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-white/20 hover:border-indigo-500/50 hover:bg-white/5"
        }`}
      >
        <UploadCloud className={`w-10 h-10 ${dragging ? "text-indigo-400" : "text-slate-500"}`} />
        <div className="text-center">
          <p className="text-white font-medium text-sm">
            {dragging ? "Drop your file here" : "Drag & drop a document"}
          </p>
          <p className="text-slate-500 text-xs mt-1">PDF, TXT, DOC, DOCX — or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4 py-3">
          <FileText size={16} className="text-indigo-400 shrink-0" />
          <span className="text-white text-sm flex-1 truncate">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-slate-500 hover:text-red-400"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
