"use client";

import { useRef, useState } from "react";

type ImageUploadDropzoneProps = {
  inputName: string;
  selectedFileName: string | null;
  onFileSelect: (file: File | null) => void;
};

export default function ImageUploadDropzone({ inputName, selectedFileName, onFileSelect }: ImageUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function setInputFile(file: File | null) {
    const inputEl = inputRef.current;
    if (!inputEl) {
      onFileSelect(file);
      return;
    }

    if (file) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputEl.files = dataTransfer.files;
    } else {
      inputEl.value = "";
    }
    onFileSelect(file);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name={inputName}
        accept="image/*"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileSelect(nextFile);
        }}
        className="sr-only"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          const droppedFile = event.dataTransfer.files?.[0] ?? null;
          setInputFile(droppedFile);
        }}
        className={`w-full rounded-md border border-dashed px-4 py-6 text-sm transition ${
          isDragOver ? "border-slate-900 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-600"
        }`}
      >
        Drag and drop image here, or click to browse
      </button>

      {selectedFileName ? <p className="text-xs text-slate-500">Selected: {selectedFileName}</p> : null}
    </div>
  );
}
