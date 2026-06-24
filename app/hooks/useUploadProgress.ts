/**
 * useUploadProgress — Issue #529
 *
 * Custom hook that uploads files via XMLHttpRequest so that
 * onprogress events are available for per-file progress bars.
 * Returns progress state, upload function, and a cancel function.
 */

import { useState, useCallback, useRef } from "react";

export type FileProgress = {
  /** 0–100 */
  percent: number;
  /** "idle" | "uploading" | "done" | "error" | "cancelled" */
  status: "idle" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
};

export type UploadResult = {
  jobId: string;
  name: string;
  url: string;
};

export function useUploadProgress() {
  const [progresses, setProgresses] = useState<Record<string, FileProgress>>({});
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Keep a ref to all active XHRs so we can abort them
  const xhrRefs = useRef<XMLHttpRequest[]>([]);

  const setFileProgress = useCallback(
    (fileName: string, update: Partial<FileProgress>) => {
      setProgresses((prev) => ({
        ...prev,
        [fileName]: { ...prev[fileName], ...update },
      }));
    },
    []
  );

  const uploadFile = useCallback(
    (file: File): Promise<UploadResult> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRefs.current.push(xhr);

        const formData = new FormData();
        formData.append("files", file);

        xhr.open("POST", "/api/upload");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setFileProgress(file.name, { percent, status: "uploading" });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              setFileProgress(file.name, { percent: 100, status: "done" });
              resolve({
                jobId: data.jobId ?? data.files?.[0]?.jobId ?? "",
                name: file.name,
                url: data.files?.[0]?.url ?? "",
              });
            } catch {
              setFileProgress(file.name, { status: "error", error: "Invalid server response" });
              reject(new Error("Invalid server response"));
            }
          } else {
            const msg = `Upload failed (HTTP ${xhr.status})`;
            setFileProgress(file.name, { status: "error", error: msg });
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          const msg = "Network error during upload";
          setFileProgress(file.name, { status: "error", error: msg });
          reject(new Error(msg));
        };

        xhr.onabort = () => {
          setFileProgress(file.name, { status: "cancelled" });
          reject(new DOMException("Upload cancelled", "AbortError"));
        };

        xhr.send(formData);
      });
    },
    [setFileProgress]
  );

  const upload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // Reset state
      xhrRefs.current = [];
      const initProgress: Record<string, FileProgress> = {};
      files.forEach((f) => (initProgress[f.name] = { percent: 0, status: "idle" }));
      setProgresses(initProgress);
      setResults([]);
      setIsUploading(true);

      try {
        const uploadResults = await Promise.allSettled(files.map(uploadFile));
        const successful: UploadResult[] = [];
        uploadResults.forEach((r) => {
          if (r.status === "fulfilled") successful.push(r.value);
        });
        setResults(successful);
        return successful;
      } finally {
        setIsUploading(false);
        xhrRefs.current = [];
      }
    },
    [uploadFile]
  );

  const cancelAll = useCallback(() => {
    xhrRefs.current.forEach((xhr) => xhr.abort());
    xhrRefs.current = [];
  }, []);

  return { progresses, results, isUploading, upload, cancelAll };
}
