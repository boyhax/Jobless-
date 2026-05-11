import { formatDistanceToNow, isValid } from "date-fns";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trash2,
  Trophy,
  Vote,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { cn } from "../../lib/utils";
import * as api from "../../services/api";
import type { Comment, Post, User } from "../../types";
import { MarkdownEditor } from "./MarkdownEditor";

const stringId = (id: any) => {
  if (!id) return "";
  if (typeof id === "string" && id.includes(":")) return id.split(":")[1];
  return id.toString();
};

type PostCardProps = {
  post: Post;
  onComment: (postId: string | number) => void;
  isExpanded?: boolean;
  currentUser: User | null;
  onApply: (postId: string | number) => void;
  onRespond: (postId: string | number, type: "quiz" | "poll", index: number) => void;
  onSelectUser: (userId: string | number) => void;
  isUnfolded: boolean;
  onUnfold: (postId: string | number | null) => void;
  onDelete?: (postId: string | number) => void;
  onEdit?: (postId: string | number, currentContent: string) => void;
};

export function PostCard({
  post,
  onComment,
  isExpanded,
  currentUser,
  onApply,
  onRespond,
  onSelectUser,
  isUnfolded,
  onUnfold,
  onDelete,
  onEdit,
}: PostCardProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const canManage =
    currentUser && (stringId(currentUser.id) === stringId(post.user_id) || currentUser.role === "admin");

  const handleDelete = async () => {
    if (onDelete && post.id) {
      setIsDeleting(true);
      await onDelete(post.id);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const loadComments = async () => {
    const data = await api.comments.list(post.id);
    setComments(data);
  };

  useEffect(() => {
    if (isExpanded) loadComments();
  }, [isExpanded]);

  const submitComment = async () => {
    if (!newComment || !currentUser) return;
    await api.comments.create(post.id, currentUser.id, newComment);
    setNewComment("");
    loadComments();
  };

  const isHiring = post?.content?.toLowerCase()?.includes("#hiring") || false;

  return (
    <Card className="mb-4">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="cursor-pointer" onClick={() => onSelectUser(post.user_id)}>
            <Avatar src={post.avatar_url} name={post.full_name} />
          </div>
          <div className="cursor-pointer" onClick={() => onSelectUser(post.user_id)}>
            <h4 className="font-semibold text-neutral-900 hover:underline">{post.full_name}</h4>
            <p className="text-xs text-neutral-500">{post.headline}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider hidden sm:inline">
              {post.created_at && isValid(new Date(post.created_at)) ? (
                <>{formatDistanceToNow(new Date(post.created_at))} ago</>
              ) : (
                <>Just now</>
              )}
            </span>

            {canManage && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-1 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-black"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onEdit?.(post.id, post.content);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          Edit Post
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsConfirmingDelete(true);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete Post
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isConfirmingDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
              >
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Delete Post?</h3>
                  <p className="text-sm text-neutral-500">
                    This action cannot be undone. The post and its comments will be permanently removed.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="prose prose-sm max-w-none text-neutral-700 mb-4">
          <MarkdownEditor.Root
            content={
              isUnfolded
                ? post.content
                : (post?.content?.length || 0) > 280
                  ? post.content.substring(0, 280) + "..."
                  : post.content
            }
          >
            <MarkdownEditor.Viewer />
          </MarkdownEditor.Root>
          {(post?.content?.length || 0) > 280 && (
            <button
              onClick={() => onUnfold(isUnfolded ? null : post.id)}
              className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black mt-2 transition-colors flex items-center gap-1"
            >
              {isUnfolded ? "View less" : "Read more"}
              <ArrowRight className={cn("w-3 h-3 transition-transform", isUnfolded ? "-rotate-90" : "rotate-0")} />
            </button>
          )}
        </div>

        {post.poll_data && (
          <div className="mb-4 bg-blue-50/20 border border-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Vote className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Career Poll</span>
            </div>
            <p className="text-xs font-bold mb-3">
              {(() => {
                try {
                  const data = typeof post.poll_data === "string" ? JSON.parse(post.poll_data) : post.poll_data;
                  return data?.question || "Poll";
                } catch {
                  return "Poll";
                }
              })()}
            </p>
            <div className="space-y-2">
              {(() => {
                try {
                  const data = typeof post.poll_data === "string" ? JSON.parse(post.poll_data) : post.poll_data;
                  if (!data?.options) return null;
                  return data.options.map((opt: string, i: number) => {
                    const stats = post.response_stats?.split(",").map((s: string) => s.split(":")) || [];
                    const votes = Number(stats.find((s: string[]) => s[0] === String(i))?.[1] || 0);
                    const total = stats.reduce((acc: number, curr: string[]) => acc + Number(curr[1]), 0);
                    const percent = total > 0 ? Math.round((votes / total) * 100) : 0;

                    return (
                      <button
                        key={i}
                        onClick={() => onRespond(post.id, "poll", i)}
                        className="w-full text-left p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-400 text-xs transition-all relative overflow-hidden"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-100/50 transition-all duration-1000"
                          style={{ width: `${percent}%` }}
                        />
                        <div className="flex justify-between items-center relative z-10 w-full">
                          <span className="font-medium">{opt}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-blue-400">{votes}</span>
                            <span className="text-[10px] text-blue-600 font-bold">{percent}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  });
                } catch {
                  return null;
                }
              })()}
            </div>
          </div>
        )}

        {post.quiz_data && (
          <div className="mb-4 bg-yellow-50/20 border border-yellow-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Skill Quiz</span>
            </div>
            <p className="text-xs font-bold mb-3">
              {(() => {
                try {
                  const data = typeof post.quiz_data === "string" ? JSON.parse(post.quiz_data) : post.quiz_data;
                  return data?.question || "Quiz";
                } catch {
                  return "Quiz";
                }
              })()}
            </p>
            <div className="space-y-2">
              {(() => {
                try {
                  const quizData = typeof post.quiz_data === "string" ? JSON.parse(post.quiz_data) : post.quiz_data;
                  if (!quizData?.options) return null;
                  return quizData.options.map((opt: string, i: number) => {
                    const isCorrect = quizData.correctIndex === i;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          onRespond(post.id, "quiz", i);
                          setShowQuizResult(true);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg bg-white border border-yellow-100 text-xs transition-all",
                          showQuizResult && isCorrect
                            ? "bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200"
                            : showQuizResult && !isCorrect
                              ? "opacity-40"
                              : "hover:border-yellow-400",
                        )}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={cn(showQuizResult && isCorrect && "font-bold")}>{opt}</span>
                          {showQuizResult && isCorrect && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        </div>
                      </button>
                    );
                  });
                } catch {
                  return null;
                }
              })()}
            </div>
          </div>
        )}

        {post.attachment_type === "cv_item" && (
          <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-3 flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-neutral-500 border border-neutral-200">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutral-800">Attached Professional Milestone</p>
              <p className="text-[10px] text-neutral-500">This user and our nodes have verified this experience entry.</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
        )}

        {isHiring && currentUser && post.user_id !== currentUser.id && (
          <div className="mb-4 p-4 bg-black rounded-xl text-white flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1 italic">{t("PostCard.opportunity_portal")}</p>
              <p className="text-[10px] opacity-70">{t("PostCard.direct_sync")}</p>
            </div>
            <Button variant="secondary" className="h-8 text-[10px] uppercase font-bold" onClick={() => onApply(post.id)}>
              {t("PostCard.apply_now")}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 mb-3">
          <button onClick={() => onComment(post.id)} className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span>{post.comment_count} Comments</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors">
            <Plus className="w-4 h-4" />
            <span>Support</span>
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-neutral-100">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar src={c.avatar_url} name={c.full_name} size="sm" />
                <div className="bg-neutral-50 rounded-lg p-2 flex-1">
                  <p className="text-[10px] font-bold mb-1">{c.full_name}</p>
                  <MarkdownEditor.Root content={c.content}>
                    <MarkdownEditor.Viewer className="text-xs text-neutral-700" />
                  </MarkdownEditor.Root>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 text-xs bg-neutral-100 border-none rounded-lg px-3 py-2"
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />
              <Button variant="outline" className="px-2 py-0" onClick={submitComment}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
