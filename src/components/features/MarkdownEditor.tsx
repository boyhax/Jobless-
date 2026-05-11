import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Markdown from "react-markdown";
import { Eye, Pencil } from "lucide-react";
import { cn } from "../../lib/utils";

type Mode = "edit" | "preview";

interface MarkdownEditorCtx {
  content: string;
  setContent: (v: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const MarkdownEditorContext = createContext<MarkdownEditorCtx | null>(null);

function useMdEditor(): MarkdownEditorCtx {
  const ctx = useContext(MarkdownEditorContext);
  if (!ctx) throw new Error("MarkdownEditor parts must be inside MarkdownEditor.Root");
  return ctx;
}

interface RootProps {
  content: string;
  onChange?: (value: string) => void;
  defaultMode?: Mode;
  children: ReactNode | ((ctx: MarkdownEditorCtx) => ReactNode);
  className?: string;
}

function Root({ content, onChange, defaultMode, children, className }: RootProps) {
  const [mode, setMode] = useState<Mode>(defaultMode ?? (onChange ? "edit" : "preview"));
  const [isLoading, setIsLoading] = useState(false);

  const setContent = useCallback((v: string) => onChange?.(v), [onChange]);

  const ctx = useMemo<MarkdownEditorCtx>(
    () => ({ content, setContent, mode, setMode, isLoading, setIsLoading }),
    [content, setContent, mode, isLoading],
  );

  return (
    <MarkdownEditorContext.Provider value={ctx}>
      <div className={className}>
        {typeof children === "function" ? children(ctx) : children}
      </div>
    </MarkdownEditorContext.Provider>
  );
}

interface ViewerProps {
  content?: string;
  className?: string;
}

function Viewer({ content: contentProp, className }: ViewerProps) {
  const { content: ctxContent } = useMdEditor();
  const value = contentProp ?? ctxContent;
  return (
    <div className={cn("markdown-body", className)}>
      <Markdown>{value}</Markdown>
    </div>
  );
}

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  className?: string;
}

function TextArea({ className, ...rest }: TextAreaProps) {
  const { content, setContent, isLoading } = useMdEditor();
  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      disabled={isLoading}
      className={cn(
        "w-full bg-neutral-50 border border-neutral-100 rounded-2xl p-4 outline-none focus:border-black transition-all font-medium text-sm resize-none",
        isLoading && "opacity-50 cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  );
}

interface ModeToggleProps {
  className?: string;
  editLabel?: string;
  previewLabel?: string;
}

function ModeToggle({ className, editLabel = "Edit", previewLabel = "Preview" }: ModeToggleProps) {
  const { mode, setMode } = useMdEditor();
  return (
    <div className={cn("flex items-center gap-1 bg-neutral-100 rounded-xl p-1 w-fit", className)}>
      <button
        type="button"
        onClick={() => setMode("edit")}
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
          mode === "edit" ? "bg-white shadow text-black" : "text-neutral-400 hover:text-black",
        )}
      >
        <Pencil className="w-3 h-3" />
        {editLabel}
      </button>
      <button
        type="button"
        onClick={() => setMode("preview")}
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
          mode === "preview" ? "bg-white shadow text-black" : "text-neutral-400 hover:text-black",
        )}
      >
        <Eye className="w-3 h-3" />
        {previewLabel}
      </button>
    </div>
  );
}

interface AutoProps {
  placeholder?: string;
  textAreaClassName?: string;
  viewerClassName?: string;
  minHeightClass?: string;
}

function Auto({ placeholder, textAreaClassName, viewerClassName, minHeightClass = "min-h-[120px]" }: AutoProps) {
  const { mode } = useMdEditor();
  if (mode === "preview") {
    return <Viewer className={cn("min-h-20 px-1", viewerClassName)} />;
  }
  return <TextArea placeholder={placeholder} className={cn(minHeightClass, textAreaClassName)} />;
}

export { useMdEditor as useMarkdownEditor };
export const MarkdownEditor = { Root, Viewer, TextArea, ModeToggle, Auto };
