import { FileText, FolderOpen, Plus, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import type { FileItem } from "../../types";

type FileGalleryProps = {
  files: FileItem[];
  onSelect: (file: FileItem) => void;
  onClose: () => void;
  onUpload: (name: string, url: string, type: string, purpose: string) => void;
  onDelete: (id: string | number) => void;
  galleryFilter: string;
  setGalleryFilter: (f: string) => void;
};

export function FileGallery({
  files,
  onSelect,
  onClose,
  onUpload,
  onDelete,
  galleryFilter,
  setGalleryFilter,
}: FileGalleryProps) {
  const filteredFiles = galleryFilter === "all" ? files : files.filter((f) => f.purpose === galleryFilter);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Professional Asset Gallery</h2>
            <p className="text-xs text-neutral-500">Manage your verified files and career artifacts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors border border-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 flex flex-col gap-6 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl overflow-x-auto scrollbar-hide">
              {["all", "cv_item", "portfolio_item", "other"].map((f) => (
                <button
                  key={f}
                  onClick={() => setGalleryFilter(f)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-widest transition-all whitespace-nowrap",
                    galleryFilter === f ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:text-neutral-600",
                  )}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>

            <label className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-neutral-800 transition-colors shrink-0">
              <Plus className="w-3 h-3 inline mr-2" /> Upload New
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    onUpload(file.name, url, file.type, galleryFilter === "all" ? "other" : galleryFilter);
                  }
                }}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 min-h-75 pb-10 scrollbar-hide">
            {(filteredFiles?.length || 0) === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-neutral-400 gap-3 py-20">
                <FolderOpen className="w-12 h-12 opacity-20" />
                <p className="text-xs font-medium">No assets found in this category</p>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="group relative bg-neutral-50 border border-neutral-200 rounded-2xl p-4 hover:border-black transition-all cursor-pointer"
                  onClick={() => onSelect(file)}
                >
                  <div className="aspect-square bg-white rounded-xl mb-3 flex items-center justify-center border border-neutral-100 group-hover:shadow-md transition-all">
                    {file.type?.startsWith("image/") ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="w-8 h-8 text-neutral-200" />
                        <span className="text-[8px] font-mono text-neutral-400 uppercase">
                          {file.type.split("/")[1] || "FILE"}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold truncate mb-1">{file.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">
                      {file.purpose.replace("_", " ")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="p-6 bg-neutral-50/50 border-t border-neutral-100">
          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-[0.2em] text-center">
            Your files are stored securely and verified by ProSync
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
