import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "./MarkdownEditor";

type EditPostModalProps = {
  isOpen: boolean;
  content: string;
  onContentChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function EditPostModal({
  isOpen,
  content,
  onContentChange,
  onClose,
  onSave,
}: EditPostModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight">Edit Post</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <MarkdownEditor.Root content={content} onChange={onContentChange}>
              <MarkdownEditor.ModeToggle className="mb-2" />
              <MarkdownEditor.Auto
                placeholder="Write your update..."
                minHeightClass="h-40"
              />
            </MarkdownEditor.Root>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" className="rounded-xl px-6" onClick={onClose}>
                Cancel
              </Button>
              <Button className="rounded-xl px-10" onClick={onSave} disabled={!content.trim()}>
                Save Changes
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
