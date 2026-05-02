import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Briefcase, 
  GraduationCap, 
  Code, 
  Award, 
  Search, 
  User as UserIcon, 
  Home, 
  MessageSquare, 
  Plus, 
  X,
  Link as LinkIcon, 
  ExternalLink,
  ChevronRight,
  Send,
  MoreHorizontal,
  Filter,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Bell,
  UserPlus,
  Users,
  AtSign,
  Hash,
  MapPin,
  TrendingUp,
  Layers,
  Menu,
  Globe,
  Sparkles,
  Vote,
  Trophy,
  Paperclip,
  Trash2,
  FolderOpen,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Mail,
  Lock,
  Newspaper,
  Zap
} from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { ProfilePanel } from './components/ProfilePanel';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Avatar } from './components/ui/Avatar';
import { cn, fetchAPI } from './lib/utils';
import { User, Post, CVSection, Skill, PortfolioItem, Comment, FileItem } from './types';
import { geminiService } from './services/geminiService';
import { formatDistanceToNow } from 'date-fns';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

// --- Views ---

const PostCard = ({ post, onComment, isExpanded, currentUser, onApply, onRespond }: { 
  post: Post; 
  onComment: (postId: number) => void; 
  isExpanded?: boolean; 
  currentUser: User | null; 
  onApply: (postId: number) => void;
  onRespond: (postId: number, type: 'quiz' | 'poll', index: number) => void;
}) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showQuizResult, setShowQuizResult] = useState(false);

  const loadComments = async () => {
    const data = await fetchAPI(`/api/posts/${post.id}/comments`);
    setComments(data);
  };

  useEffect(() => {
    if (isExpanded) loadComments();
  }, [isExpanded]);

  const submitComment = async () => {
    if (!newComment || !currentUser) return;
    await fetchAPI('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ user_id: currentUser.id, post_id: post.id, content: newComment })
    });
    setNewComment('');
    loadComments();
  };

  const isHiring = post.content.toLowerCase().includes('#hiring');

  return (
    <Card className="mb-4">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={post.avatar_url} name={post.full_name} />
          <div>
            <h4 className="font-semibold text-neutral-900">{post.full_name}</h4>
            <p className="text-xs text-neutral-500">{post.headline}</p>
          </div>
          <div className="ml-auto text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
            {formatDistanceToNow(new Date(post.created_at))} ago
          </div>
        </div>
        
        <div className="prose prose-sm max-w-none text-neutral-700 mb-4">
          <div className="markdown-body">
             <Markdown>{post.content}</Markdown>
          </div>
        </div>

        {post.poll_data && (
          <div className="mb-4 bg-blue-50/20 border border-blue-50 rounded-xl p-4">
             <div className="flex items-center gap-2 mb-3">
               <Vote className="w-3.5 h-3.5 text-blue-500" />
               <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Career Poll</span>
             </div>
             <p className="text-xs font-bold mb-3">{JSON.parse(post.poll_data).question}</p>
             <div className="space-y-2">
               {JSON.parse(post.poll_data).options.map((opt: string, i: number) => {
                  const stats = post.response_stats?.split(',').map(s => s.split(':')) || [];
                  const votes = Number(stats.find(s => s[0] === String(i))?.[1] || 0);
                  const total = stats.reduce((acc, curr) => acc + Number(curr[1]), 0);
                  const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
                  
                  return (
                    <button 
                      key={i}
                      onClick={() => onRespond(post.id, 'poll', i)}
                      className="w-full text-left p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-400 text-xs transition-all relative overflow-hidden"
                    >
                      <div className="absolute inset-y-0 left-0 bg-blue-100/50 transition-all duration-1000" style={{ width: `${percent}%` }} />
                      <div className="flex justify-between items-center relative z-10 w-full">
                        <span className="font-medium">{opt}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-400">{votes}</span>
                          <span className="text-[10px] text-blue-600 font-bold">{percent}%</span>
                        </div>
                      </div>
                    </button>
                  );
               })}
             </div>
          </div>
        )}

        {post.quiz_data && (
          <div className="mb-4 bg-yellow-50/20 border border-yellow-50 rounded-xl p-4">
             <div className="flex items-center gap-2 mb-3">
               <Trophy className="w-3.5 h-3.5 text-yellow-500" />
               <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Skill Quiz</span>
             </div>
             <p className="text-xs font-bold mb-3">{JSON.parse(post.quiz_data).question}</p>
             <div className="space-y-2">
               {JSON.parse(post.quiz_data).options.map((opt: string, i: number) => {
                  const quizParsed = JSON.parse(post.quiz_data!);
                  const isCorrect = quizParsed.correctIndex === i;
                  return (
                    <button 
                      key={i}
                      onClick={() => {
                        onRespond(post.id, 'quiz', i);
                        setShowQuizResult(true);
                      }}
                      className={cn(
                        "w-full text-left p-2 rounded-lg bg-white border border-yellow-100 text-xs transition-all",
                        showQuizResult && isCorrect ? "bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200" : 
                        showQuizResult && !isCorrect ? "opacity-40" : "hover:border-yellow-400"
                      )}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={cn(showQuizResult && isCorrect && "font-bold")}>{opt}</span>
                        {showQuizResult && isCorrect && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      </div>
                    </button>
                  );
               })}
             </div>
          </div>
        )}

        {post.attachment_type === 'cv_item' && (
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
              <p className="text-xs font-bold uppercase tracking-widest mb-1 italic">{t('PostCard.opportunity_portal')}</p>
              <p className="text-[10px] opacity-70">{t('PostCard.direct_sync')}</p>
            </div>
            <Button variant="secondary" className="h-8 text-[10px] uppercase font-bold" onClick={() => onApply(post.id)}>{t('PostCard.apply_now')}</Button>
          </div>
        )}

        <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 mb-3">
          <button 
            onClick={() => onComment(post.id)}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors"
          >
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
             {comments.map(c => (
               <div key={c.id} className="flex gap-3">
                 <Avatar src={c.avatar_url} name={c.full_name} size="sm" />
                 <div className="bg-neutral-50 rounded-lg p-2 flex-1">
                   <p className="text-[10px] font-bold mb-1">{c.full_name}</p>
                   <p className="text-xs text-neutral-700">{c.content}</p>
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
                 onKeyDown={(e) => e.key === 'Enter' && submitComment()}
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
};

export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  
  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'jobs' | 'applicants'>('feed');
  const [searchType, setSearchType] = useState<'all' | 'posts' | 'jobs' | 'users'>('all');
  const [searchResults, setSearchResults] = useState<any>({ posts: [], jobs: [], users: [] });
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantFilter, setApplicantFilter] = useState<'all' | 'pending' | 'shortlisted'>('all');
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantTypeFilter, setApplicantTypeFilter] = useState<'all' | 'cv_item' | 'portfolio_item' | 'none'>('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobFilters, setJobFilters] = useState({ q: '', experience: 'all', minSalary: '' });
  const [applyingToJobId, setApplyingToJobId] = useState<number | null>(null);
  const [appAttachmentType, setAppAttachmentType] = useState<'cv_item' | 'portfolio_item' | 'none'>('none');
  const [appAttachmentId, setAppAttachmentId] = useState<number | null>(null);
  const [jobAlerts, setJobAlerts] = useState<any[]>([]);
  const [showJobAlertForm, setShowJobAlertForm] = useState(false);
  const [newJobAlert, setNewJobAlert] = useState({ keyword: '', experience_level: 'all', location: '' });

  // Job form states
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', location: '', description: '', salary_range: '', experience_level: 'Mid', end_date: '' });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'messages'>('profile');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Mobile drawer states
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [leftSidebarView, setLeftSidebarView] = useState<'discovery' | 'profile'>('discovery');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [verifyingSkillName, setVerifyingSkillName] = useState<string | null>(null);
  const [verificationUrlInput, setVerificationUrlInput] = useState('');

  // AI States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiApplicantsFeedback, setAiApplicantsFeedback] = useState<any[] | null>(null);
  const [aiOptimizedPost, setAiOptimizedPost] = useState<any>(null);

  // Slash Command and Interactive Elements
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showFileGallery, setShowFileGallery] = useState(false);
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | 'all'>('all');
  const [postQuiz, setPostQuiz] = useState<{ question: string, options: string[], correctIndex: number } | null>(null);
  const [postPoll, setPostPoll] = useState<{ question: string, options: string[] } | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'password' | 'register' | 'forgot' | 'verify' | 'new_pass'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handleCheckEmail = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAPI('/api/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (res.exists) {
        setAuthStep('password');
      } else {
        setAuthStep('register');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      completeLogin(user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      const user = await fetchAPI('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      completeLogin(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAPI('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setDebugOtp(res.debug_otp); // For demo
      setAuthStep('verify');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchAPI('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });
      setAuthStep('new_pass');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchAPI('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword })
      });
      setAuthStep('password');
      setPassword('');
      alert('Password reset successfully. Please login.');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = (user: any) => {
    setCurrentUser(user);
    setSelectedUserId(user.id);
    if (user.place_id) {
      setSelectedPlaceId(user.place_id);
    }
    fetchFeed();
    fetchConversations();
    fetchNotifications();
    setAuthStep('email');
    setEmail('');
    setPassword('');
    setFullName('');
    setOtp('');
    setNewPassword('');
    setDebugOtp(null);
  };

  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchPlaces = async () => {
    try {
      const data = await fetchAPI('/api/places');
      setPlaces(data);
    } catch (e) {
      console.error(e);
    }
  };

  const login = async (loginEmail: string) => {
    try {
      const user = await fetchAPI('/api/auth/login', { 
        method: 'POST', 
        body: JSON.stringify({ email: loginEmail }) 
      });
      setCurrentUser(user);
      setSelectedUserId(user.id);
      if (user.place_id) {
        setSelectedPlaceId(user.place_id);
      }
      fetchFeed();
      fetchConversations();
      fetchNotifications();
    } catch (err) {
      console.error(err);
      alert(t('login_failed_try_seeded'));
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPlaces();
    if (currentUser) {
      if (!selectedUserId) setSelectedUserId(currentUser.id);
      if (currentUser.place_id && selectedPlaceId === 'all') {
        setSelectedPlaceId(currentUser.place_id);
      }
      fetchFeed();
      fetchConversations();
      fetchNotifications();
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [searchQuery]);

  useEffect(() => {
    if (selectedUserId) fetchProfile(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    fetchCandidates();
  }, [searchQuery]);

  const fetchConversations = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`/api/messages/conversations/${currentUser.id}`);
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatMessages = async (targetId: number) => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`/api/messages/${currentUser.id}/${targetId}`);
      setChatMessages(data);
      if (activeTab === 'messages' && !activeChatUser) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendChatMessage = async () => {
    if (!currentUser || !activeChatUser || !newChatMessage.trim()) return;
    try {
      await fetchAPI('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          sender_id: currentUser.id,
          receiver_id: activeChatUser.id,
          content: newChatMessage
        })
      });
      setNewChatMessage('');
      fetchChatMessages(activeChatUser.id);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeChatUser) {
      fetchChatMessages(activeChatUser.id);
      const interval = setInterval(() => fetchChatMessages(activeChatUser.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeChatUser]);

  const fetchSearch = async () => {
    if (!searchQuery && searchType === 'all') {
      fetchFeed();
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAPI(`/api/search?q=${searchQuery}&type=${searchType}`);
      setSearchResults(data);
      if (searchType === 'posts' || searchType === 'all') setPosts(data.posts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearch();
  }, [searchQuery, searchType]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/content');
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (jobId: number) => {
    try {
      const data = await fetchAPI(`/api/jobs/${jobId}/applicants`);
      setApplicants(data);
      setSelectedJobId(jobId);
      setActiveMainTab('applicants');
    } catch (err) {
      console.error(err);
    }
  };

  const updateApplicantStatus = async (appId: number, status: string) => {
    await fetchAPI('/api/jobs/applications/status', {
      method: 'POST',
      body: JSON.stringify({ applicationId: appId, status })
    });
    if (selectedJobId) fetchApplicants(selectedJobId);
  };

  const fetchProfile = async (id: number) => {
    try {
      const viewerId = currentUser?.id ? `?viewerId=${currentUser.id}` : '';
      const data = await fetchAPI(`/api/profile/${id}${viewerId}`);
      setProfileData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const data = await fetchAPI(`/api/candidates?skills=${searchQuery}`);
      setCandidates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendations = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`/api/recommendations/${currentUser.id}`);
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const query = new URLSearchParams();
      const searchTerm = searchType === 'jobs' ? searchQuery : jobFilters.q;
      if (searchTerm) query.set('q', searchTerm);
      if (jobFilters.experience !== 'all') query.set('experience', jobFilters.experience);
      if (jobFilters.minSalary) query.set('minSalary', jobFilters.minSalary);
      if (selectedPlaceId !== 'all') query.set('placeId', selectedPlaceId.toString());
      
      const data = await fetchAPI(`/api/jobs?${query.toString()}`);
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRecommendations();
      fetchJobs();
    }
  }, [currentUser, jobFilters, searchQuery, searchType]);

  const requestSync = async (targetId: number) => {
    if (!currentUser) return;
    await fetchAPI('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ user_id: currentUser.id, target_id: targetId })
    });
    alert('Sync request sent!');
  };

  const applyToJob = async () => {
    if (!currentUser || !applyingToJobId) return;
    const res = await fetchAPI('/api/jobs/apply', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: currentUser.id, 
        job_id: applyingToJobId,
        attachment_type: appAttachmentType,
        attachment_id: appAttachmentId
      })
    });
    alert(res.message || 'Application sent successfully!');
    setApplyingToJobId(null);
    setAppAttachmentType('none');
    setAppAttachmentId(null);
  };

  const postJob = async () => {
    if (!currentUser || !newJob.title || !newJob.description) return;
    await fetchAPI('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        user_id: currentUser.id,
        company_name: currentUser.full_name,
        ...newJob
      })
    });
    setNewJob({ title: '', location: '', description: '', salary_range: '', experience_level: 'Mid', end_date: '' });
    setShowJobForm(false);
    fetchJobs();
    fetchFeed();
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`/api/notifications/${currentUser.id}`);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserFiles = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`/api/files/${currentUser.id}`);
      setUserFiles(data);
    } catch (err) {
       console.error(err);
    }
  };

  const uploadFile = async (name: string, url: string, type: string, purpose: string) => {
    if (!currentUser) return;
    try {
      await fetchAPI('/api/files', {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUser.id, name, url, type, purpose })
      });
      fetchUserFiles();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFile = async (fileId: number) => {
    try {
      await fetchAPI(`/api/files/${fileId}`, { method: 'DELETE' });
      fetchUserFiles();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobAlerts = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI(`/api/job-alerts/${currentUser.id}`);
      setJobAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const createJobAlert = async () => {
    if (!currentUser) return;
    try {
      await fetchAPI('/api/job-alerts', {
        method: 'POST',
        body: JSON.stringify({ ...newJobAlert, user_id: currentUser.id })
      });
      setNewJobAlert({ keyword: '', experience_level: 'all', location: '' });
      setShowJobAlertForm(false);
      fetchJobAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteJobAlert = async (id: number) => {
    try {
      await fetchAPI(`/api/job-alerts/${id}`, { method: 'DELETE' });
      fetchJobAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      fetchJobAlerts();
      const interval = setInterval(() => {
        fetchNotifications();
        fetchJobAlerts();
      }, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const markAsRead = async (id: number) => {
    await fetchAPI('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId: id })
    });
    fetchNotifications();
  };

  // AI Functionality
  const handleAiRankJobs = async () => {
    if (!searchQuery && jobFilters.q === '') return;
    setIsAiLoading(true);
    try {
      const ranked = await geminiService.rankJobs(jobs, searchQuery || jobFilters.q);
      setJobs(ranked);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiShortlistApplicants = async () => {
    if (!selectedJobId) return;
    const currentJob = jobs.find(j => j.id === selectedJobId);
    if (!currentJob) return;
    
    setIsAiLoading(true);
    try {
      const feedback = await geminiService.shortlistApplicants(currentJob.description, applicants);
      setAiApplicantsFeedback(feedback);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiOptimizePost = async () => {
    if (!postContent) return;
    setIsAiLoading(true);
    try {
      const optimization = await geminiService.optimizePost(postContent);
      if (optimization) {
        setAiOptimizedPost(optimization);
        setPostContent(optimization.optimizedContent);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiGenerateInteractive = async (type: 'quiz' | 'poll') => {
    if (!postContent) return;
    setIsAiLoading(true);
    try {
      const result = await geminiService.generateInteractiveContent(postContent, type);
      if (result) {
        if (type === 'quiz') setPostQuiz(result);
        else setPostPoll(result);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePostResponse = async (postId: number, type: 'quiz' | 'poll', index: number) => {
    try {
      await fetchAPI(`/api/posts/${postId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUser!.id, type, response_index: index })
      });
      fetchFeed();
    } catch (error) {
      console.error(error);
    }
  };

  const [showCVForm, setShowCVForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [cvForm, setCvForm] = useState({
    type: 'experience',
    title: '',
    subtitle: '',
    description: '',
    start_date: '',
    end_date: '',
    verification_url: '',
    keywords: ''
  });

  const [skillForm, setSkillForm] = useState({ name: '', proficiency: 3, verification_url: '' });
  const [portfolioForm, setPortfolioForm] = useState({ title: '', url: '', description: '', thumbnail_url: '' });
  const [profileForm, setProfileForm] = useState({ headline: '', bio: '', avatar_url: '', company_name: '', company_description: '', company_website: '' });

  const updateProfile = async () => {
    if (!currentUser) return;
    await fetchAPI('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ ...profileForm, user_id: currentUser.id })
    });
    fetchProfile(currentUser.id);
    setIsEditingProfile(false);
  };

  const addSkill = async (skillData?: any) => {
    if (!currentUser) return;
    const data = skillData || skillForm;
    await fetchAPI('/api/skills', {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: currentUser.id })
    });
    fetchProfile(currentUser.id);
    setShowSkillForm(false);
    setSkillForm({ name: '', proficiency: 3, verification_url: '' });
  };

  const verifySkill = async (skillName: string, url: string) => {
    if (!currentUser || !url) return;
    await fetchAPI('/api/skills/verify', {
      method: 'POST',
      body: JSON.stringify({ user_id: currentUser.id, name: skillName, verification_url: url })
    });
    fetchProfile(currentUser.id);
  };

  const addPortfolioItem = async (pData?: any) => {
    if (!currentUser) return;
    const data = pData || portfolioForm;
    await fetchAPI('/api/portfolio', {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: currentUser.id })
    });
    fetchProfile(currentUser.id);
    setShowPortfolioForm(false);
  };

  const addCVItem = async (cData?: any) => {
    if (!currentUser) return;
    const data = cData || cvForm;
    try {
      await fetchAPI('/api/cv', {
        method: 'POST',
        body: JSON.stringify({ ...data, user_id: currentUser.id })
      });
      fetchProfile(currentUser.id);
      setShowCVForm(false);
      setCvForm({
        type: 'experience',
        title: '',
        subtitle: '',
        description: '',
        start_date: '',
        end_date: '',
        verification_url: '',
        keywords: ''
      });
      fetchFeed(); // Refresh feed since CV updates create posts
    } catch (err) {
      console.error(err);
    }
  };

  const [attachmentType, setAttachmentType] = useState<'none' | 'cv_item' | 'portfolio_item' | 'link' | 'discussion'>('none');
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [postContent, setPostContent] = useState('');
  const [isPostFocused, setIsPostFocused] = useState(false);

  const submitPost = async () => {
    if ((!postContent && !postQuiz && !postPoll) || !currentUser) return;
    await fetchAPI('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: currentUser.id, 
        content: postContent,
        attachment_type: attachmentType === 'none' ? null : attachmentType,
        attachment_id: attachmentId,
        quiz_data: postQuiz,
        poll_data: postPoll
      })
    });
    setPostContent('');
    setAttachmentType('none');
    setAttachmentId(null);
    setPostQuiz(null);
    setPostPoll(null);
    setAiOptimizedPost(null);
    fetchFeed();
  };

  return (
    <div className={cn("h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200 flex overflow-hidden", i18n.language === 'ar' ? "flex-row-reverse" : "flex-row")} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Routes>
        <Route path="/" element={
          <>
      {/* LEFT COLUMN: DISCOVER / SEARCH */}
      <AnimatePresence>
        {isLeftOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLeftOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
      <motion.aside 
        initial={false}
        animate={{ x: isLeftOpen || windowWidth >= 768 ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-white border-r border-neutral-200 z-50 md:static md:translate-x-0 shadow-2xl md:shadow-none shrink-0"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <header className="mb-8 items-center justify-between flex shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-black p-2 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-black tracking-tighter">ProSync Oman</h1>
            </div>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setIsLeftOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg md:hidden text-neutral-400"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-10 scrollbar-hide py-4 px-6 md:px-8">
              {/* SUGGESTED TOPICS */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                  <Hash className="w-3 h-3 text-blue-500" />
                  {t('App.trending_pulse') || 'Trending Pulse'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['#FutureOman', '#TechSynapse', '#OmanVision2040', '#CareerScale', '#IndustrialOps'].map(topic => (
                    <button 
                      key={topic} 
                      onClick={() => {
                        setSearchQuery(topic);
                        setActiveMainTab('feed');
                        setIsLeftOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center gap-1.5 group"
                    >
                      <span>{topic}</span>
                      <TrendingUp className="w-2.5 h-2.5 text-neutral-300 group-hover:text-green-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </section>

              {/* SUGGESTED CONTACTS */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                  <Users className="w-3 h-3 text-purple-500" />
                  Suggested Connections
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'Amna Al-Said', role: 'UX Director' },
                    { name: 'Khalid Ben-Walid', role: 'Cloud Lead' },
                    { name: 'Sara Al-Omani', role: 'AI Researcher' }
                  ].map((contact, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200">
                        <UserIcon className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-neutral-900 truncate">{contact.name}</p>
                        <p className="text-[9px] text-neutral-400 uppercase tracking-tight">{contact.role}</p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-neutral-300 group-hover:text-black transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* CENTER COLUMN: THE FEED */}
      <main className="flex-1 h-full overflow-y-auto bg-neutral-50 relative">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 md:pt-8 md:pb-12">
          {/* Integrated Search Console */}
          <div className="flex flex-col gap-3 mb-8">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsLeftOpen(true)} 
                className={cn(
                  "p-2 hover:bg-neutral-200/50 rounded-full transition-all md:hidden",
                  isLeftOpen && "hidden"
                )}
              >
                <Menu className="w-5 h-5 text-neutral-600" />
              </button>
              
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                <input 
                  type="text" 
                  placeholder={t('App.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-2xl pl-12 pr-12 py-3 text-sm focus:ring-4 focus:ring-black/5 focus:border-neutral-300 transition-all outline-none shadow-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  {searchType === 'jobs' && (
                    <button 
                      onClick={handleAiRankJobs}
                      disabled={isAiLoading || !searchQuery}
                      className="p-2 text-blue-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
                      title={t('App.ai_rank')}
                    >
                      <Sparkles className={cn("w-4 h-4", isAiLoading && "animate-spin")} />
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={() => { 
                  if (currentUser) {
                    setSelectedUserId(currentUser.id); 
                    setActiveTab(null); 
                    setIsRightOpen(true);
                    setIsEditingProfile(false);
                  } else {
                    setIsRightOpen(true);
                  }
                }} 
                className="shrink-0 hover:opacity-80 transition-opacity"
              >
                {currentUser ? (
                  <div className="relative p-0.5 border-2 border-transparent hover:border-black rounded-full transition-all">
                    <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" title="Online" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200">
                    <UserIcon className="w-4 h-4 text-neutral-400" />
                  </div>
                )}
              </button>
            </div>
            
            {/* Search Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: t('all') },
                { id: 'posts', label: t('posts') },
                { id: 'jobs', label: t('jobs') },
                { id: 'users', label: t('users') },
                ...(currentUser?.role === 'admin' ? [{ id: 'admin', label: t('admin') }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSearchType(tab.id as any);
                    if (tab.id === 'jobs') setActiveMainTab('jobs');
                    else if (tab.id === 'admin') navigate('/admin');
                    else if (['all', 'posts', 'users'].includes(tab.id)) setActiveMainTab('feed');
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    searchType === tab.id 
                      ? "bg-black text-white shadow-md shadow-black/10 scale-105" 
                      : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeMainTab === 'feed' ? (
            <div className="space-y-6">
              {/* Search Results Facets */}
              {searchQuery && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {searchResults.jobs?.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">{t('App.jobs') || 'Jobs'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.jobs.map((j: any) => (
                          <Card key={j.id} className="p-4 bg-white/50 backdrop-blur-sm border-dashed border-2">
                             <h4 className="font-bold text-sm">{j.title}</h4>
                             <p className="text-[10px] text-neutral-500">{j.company_name}</p>
                             <div className="flex items-center justify-between mt-2">
                               <span className="text-[8px] font-mono text-neutral-400">{j.location}</span>
                               <Button onClick={() => setActiveMainTab('jobs')} variant="ghost" className="h-6 text-[8px] p-0">View Jobs</Button>
                             </div>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}
                  
                  {searchResults.users?.some((u: any) => u.is_company_rep) && (
                    <section>
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">{t('App.organizations') || 'Organizations'}</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {searchResults.users.filter((u: any) => u.is_company_rep).map((u: any) => (
                          <button 
                            key={u.id} 
                            onClick={() => { setSelectedUserId(u.id); setIsRightOpen(true); }}
                            className="flex-shrink-0 w-32 flex flex-col items-center text-center group"
                          >
                            <div className="relative">
                              <Avatar src={u.avatar_url} name={u.full_name} size="md" />
                              <div className="absolute -bottom-1 -right-1 bg-black text-white p-1 rounded-full border border-white">
                                <Briefcase className="w-2 h-2" />
                              </div>
                            </div>
                            <p className="text-[10px] font-bold mt-2 truncate w-full">{u.full_name}</p>
                            <p className="text-[8px] text-neutral-400 truncate w-full uppercase">Verified Org</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {searchResults.users?.some((u: any) => !u.is_company_rep) && (
                    <section>
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">{t('App.users') || 'Users'}</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {searchResults.users.filter((u: any) => !u.is_company_rep).map((u: any) => (
                          <button 
                            key={u.id} 
                            onClick={() => { setSelectedUserId(u.id); setIsRightOpen(true); }}
                            className="flex-shrink-0 w-32 flex flex-col items-center text-center group"
                          >
                            <Avatar src={u.avatar_url} name={u.full_name} size="md" />
                            <p className="text-[10px] font-bold mt-2 truncate w-full">{u.full_name}</p>
                            <p className="text-[8px] text-neutral-400 truncate w-full uppercase font-mono">{u.headline?.split('|')[0]}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Box to Post */}
              {currentUser && (
                <div className="bg-white rounded-2xl shadow-sm transition-all duration-300 relative px-4 pt-4 pb-2">
                  <div className="flex gap-3">
                    <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
                    <div className="flex-1 flex flex-col relative min-h-[44px]">
                      <textarea 
                        placeholder="What's moving in your career? Use #tags or / to add quiz/poll..." 
                        value={postContent}
                        onFocus={() => setIsPostFocused(true)}
                        onBlur={() => {
                          // Delay blur to allow clicking menu items
                          setTimeout(() => setIsPostFocused(false), 200);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPostContent(val);
                          if (val.endsWith('/')) {
                            setShowSlashMenu(true);
                          } else if (showSlashMenu && !val.includes('/')) {
                            setShowSlashMenu(false);
                          }
                        }}
                        className={cn(
                          "w-full border-none focus:ring-0 text-xs py-2 resize-y transition-all duration-300 bg-transparent",
                          isPostFocused ? "min-h-[120px]" : "min-h-[44px]"
                        )}
                      />

                      {showSlashMenu && (
                        <div className="absolute left-0 bottom-full mb-2 bg-white border border-neutral-200 rounded-xl shadow-xl p-1 z-50 min-w-[140px] animate-in fade-in slide-in-from-bottom-2">
                          <p className="px-3 py-1.5 text-[7px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-50">Career Interactive</p>
                          <button 
                            onClick={() => {
                              setPostPoll({ question: '', options: ['', ''] });
                              setPostContent(postContent.replace(/\/$/, ''));
                              setShowSlashMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors text-left"
                          >
                            <Vote className="w-3 h-3 text-blue-500" />
                            Create Poll
                          </button>
                          <button 
                            onClick={() => {
                              setPostQuiz({ question: '', options: ['', ''], correctIndex: 0 });
                              setPostContent(postContent.replace(/\/$/, ''));
                              setShowSlashMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors text-left"
                          >
                            <Trophy className="w-3 h-3 text-yellow-500" />
                            Create Quiz
                          </button>
                        </div>
                      )}

                      {/* Integrated Action Buttons */}
                      <div className={cn(
                        "flex items-center justify-between mt-2 pt-2 transition-all border-t border-neutral-50",
                        isPostFocused ? "opacity-100" : "opacity-60 scale-95 origin-left"
                      )}>
                        <div className="flex items-center gap-1 relative">
                          <button 
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all flex items-center gap-2 shrink-0",
                              showAttachMenu ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-100"
                            )}
                            title="Attach Item"
                          >
                            <Plus className={cn("w-3.5 h-3.5 transition-transform", showAttachMenu && "rotate-45")} />
                            <span className="text-[9px] font-bold hidden md:inline uppercase tracking-widest">Attach</span>
                          </button>

                          {showAttachMenu && (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                              <button 
                                onClick={() => { setAttachmentType('cv_item'); setShowAttachMenu(false); }}
                                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                title="CV Entry"
                              >
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">CV</span>
                              </button>
                              <button 
                                onClick={() => { setAttachmentType('link'); setShowAttachMenu(false); }}
                                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                title="External Link"
                              >
                                <LinkIcon className="w-4 h-4 text-purple-500" />
                                <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">Link</span>
                              </button>
                              <button 
                                onClick={() => { setShowFileGallery(true); setShowAttachMenu(false); fetchUserFiles(); }}
                                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                title="My Files"
                              >
                                <FolderOpen className="w-4 h-4 text-orange-500" />
                                <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">Files</span>
                              </button>
                              <button 
                                onClick={() => { setPostPoll({ question: '', options: ['', ''] }); setShowAttachMenu(false); }}
                                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                title="Poll"
                              >
                                <Vote className="w-4 h-4 text-green-500" />
                                <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">Poll</span>
                              </button>
                            </div>
                          )}

                          <div className="h-3 w-[1px] bg-neutral-100 mx-1" />
                          
                          <button 
                            onClick={handleAiOptimizePost}
                            disabled={isAiLoading || !postContent}
                            className={cn(
                              "p-1.5 rounded-lg transition-all flex items-center gap-2 text-blue-500 hover:bg-blue-50 disabled:opacity-30"
                            )}
                            title="AI Optimize Post"
                          >
                            <Sparkles className={cn("w-3.5 h-3.5", isAiLoading && "animate-spin")} />
                          </button>

                          <button 
                            onClick={() => handleAiGenerateInteractive('poll')}
                            disabled={isAiLoading || !postContent}
                            className={cn(
                              "p-1.5 rounded-lg transition-all flex items-center gap-2 text-green-500 hover:bg-green-50 disabled:opacity-30"
                            )}
                            title="AI Generate Poll"
                          >
                            <Vote className={cn("w-3.5 h-3.5", isAiLoading && "animate-spin")} />
                          </button>

                          <button 
                            onClick={() => handleAiGenerateInteractive('quiz')}
                            disabled={isAiLoading || !postContent}
                            className={cn(
                              "p-1.5 rounded-lg transition-all flex items-center gap-2 text-yellow-500 hover:bg-yellow-50 disabled:opacity-30"
                            )}
                            title="AI Generate Quiz"
                          >
                            <Trophy className={cn("w-3.5 h-3.5", isAiLoading && "animate-spin")} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            disabled={(!postContent && !postQuiz && !postPoll) || isAiLoading}
                            onClick={submitPost}
                            className="px-4 py-1.5 bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] hover:bg-neutral-800 disabled:opacity-30 transition-all flex items-center gap-2"
                          >
                            Publish
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    {/* Poll Builder */}
                    {postPoll && (
                      <div className="mb-4 p-4 bg-blue-50/30 border border-blue-100 rounded-xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Vote className="w-4 h-4 text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Career Poll</span>
                          </div>
                          <X className="w-4 h-4 text-neutral-400 cursor-pointer" onClick={() => setPostPoll(null)} />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Ask a question..."
                          className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2 text-[10px] mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                          value={postPoll.question}
                          onChange={(e) => setPostPoll({ ...postPoll, question: e.target.value })}
                        />
                        <div className="space-y-2">
                          {postPoll.options.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder={`Option ${i+1}`}
                                className="flex-1 bg-white border border-blue-50 rounded-lg px-3 py-1.5 text-[10px] focus:ring-1 focus:ring-blue-500 outline-none"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...postPoll.options];
                                  newOpts[i] = e.target.value;
                                  setPostPoll({ ...postPoll, options: newOpts });
                                }}
                              />
                              {postPoll.options.length > 2 && (
                                <button onClick={() => setPostPoll({ ...postPoll, options: postPoll.options.filter((_, idx) => idx !== i) })} className="text-neutral-300 hover:text-red-500">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {postPoll.options.length < 5 && (
                            <button 
                              onClick={() => setPostPoll({ ...postPoll, options: [...postPoll.options, ''] })}
                              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Option
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quiz Builder */}
                    {postQuiz && (
                      <div className="mb-4 p-4 bg-yellow-50/30 border border-yellow-100 rounded-xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">Career Quiz</span>
                          </div>
                          <X className="w-4 h-4 text-neutral-400 cursor-pointer" onClick={() => setPostQuiz(null)} />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Enter quiz question..."
                          className="w-full bg-white border border-yellow-100 rounded-lg px-3 py-2 text-[10px] mb-2 focus:ring-1 focus:ring-yellow-500 outline-none"
                          value={postQuiz.question}
                          onChange={(e) => setPostQuiz({ ...postQuiz, question: e.target.value })}
                        />
                        <div className="space-y-2">
                          {postQuiz.options.map((opt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input 
                                type="radio"
                                checked={postQuiz.correctIndex === i}
                                onChange={() => setPostQuiz({ ...postQuiz, correctIndex: i })}
                                className="w-3 h-3 text-yellow-500"
                              />
                              <input 
                                type="text" 
                                placeholder={`Option ${i+1}`}
                                className={cn("flex-1 bg-white border border-yellow-50 rounded-lg px-3 py-1.5 text-[10px] focus:ring-1 focus:ring-yellow-500 outline-none", postQuiz.correctIndex === i && "border-yellow-300 ring-1 ring-yellow-300")}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...postQuiz.options];
                                  newOpts[i] = e.target.value;
                                  setPostQuiz({ ...postQuiz, options: newOpts });
                                }}
                              />
                              {postQuiz.options.length > 2 && (
                                <button onClick={() => setPostQuiz({ ...postQuiz, options: postQuiz.options.filter((_, idx) => idx !== i) })} className="text-neutral-300 hover:text-red-500">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {postQuiz.options.length < 5 && (
                            <button 
                              onClick={() => setPostQuiz({ ...postQuiz, options: [...postQuiz.options, ''] })}
                              className="text-[10px] font-bold text-yellow-500 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Option
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {attachmentType !== 'none' && (
                      <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-neutral-400 cursor-pointer hover:text-black" onClick={() => setAttachmentType('none')} />
                          <span className="text-[10px] font-bold uppercase tracking-tight text-neutral-500">Attached: {attachmentType.replace('_', ' ')}</span>
                        </div>
                        {attachmentType === 'cv_item' && profileData?.cv && (
                          <select 
                            className="text-[10px] bg-white border border-neutral-200 rounded-lg px-2 py-1 outline-none"
                            onChange={(e) => setAttachmentId(Number(e.target.value))}
                          >
                            <option value="">Select CV Entry...</option>
                            {profileData.cv.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.title} at {item.subtitle}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            {aiOptimizedPost && (
                <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">AI Content Assist</span>
                  </div>
                  
                  {aiOptimizedPost.quiz && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Suggested Quiz</p>
                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <p className="text-xs font-bold mb-2">{aiOptimizedPost.quiz.question}</p>
                        <div className="space-y-1">
                          {aiOptimizedPost.quiz.options.map((opt: string, i: number) => (
                            <div key={i} className="text-[10px] p-2 bg-neutral-50 rounded-lg border border-neutral-100">{opt}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {aiOptimizedPost.poll && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Suggested Poll</p>
                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <p className="text-xs font-bold mb-2">{aiOptimizedPost.poll.question}</p>
                        <div className="space-y-1">
                          {aiOptimizedPost.poll.options.map((opt: string, i: number) => (
                            <div key={i} className="text-[10px] p-2 bg-neutral-50 rounded-lg border border-neutral-100">{opt}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setAiOptimizedPost(null)}
                    className="mt-4 text-[10px] text-blue-500 font-bold hover:underline"
                  >
                    Clear AI suggestions
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser}
                    onApply={applyToJob}
                    isExpanded={expandedPost === post.id}
                    onComment={(id) => setExpandedPost(expandedPost === id ? null : id)} 
                    onRespond={handlePostResponse}
                  />
                ))}
              </div>
            </div>
          ) : activeMainTab === 'applicants' ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Applicant Portal</h2>
                  <p className="text-xs text-neutral-500">Managing talent for Job ID: {selectedJobId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleAiShortlistApplicants}
                    disabled={isAiLoading}
                    variant="outline" 
                    className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Sparkles className={cn("w-3 h-3 mr-2", isAiLoading && "animate-spin")} />
                    {t('App.ai_search')}
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveMainTab('jobs')} className="text-xs">
                    Back to Jobs
                  </Button>
                </div>
              </header>

              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white border border-neutral-200 rounded-3xl p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'pending', 'shortlisted'] as const).map(f => (
                    <button 
                      key={f} 
                      onClick={() => setApplicantFilter(f)}
                      className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all", applicantFilter === f ? "bg-black text-white shadow-sm" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100")}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                    <input 
                      type="text"
                      placeholder="Search name..."
                      value={applicantSearch}
                      onChange={(e) => setApplicantSearch(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-8 pr-3 py-2 text-[10px] focus:ring-1 focus:ring-black outline-none"
                    />
                  </div>
                  <select 
                    value={applicantTypeFilter}
                    onChange={(e: any) => setApplicantTypeFilter(e.target.value)}
                    className="bg-neutral-50 border border-neutral-100 rounded-xl px-2 py-2 text-[10px] font-bold text-neutral-500 uppercase outline-none"
                  >
                    <option value="all">Any Proof</option>
                    <option value="cv_item">CV Only</option>
                    <option value="portfolio_item">Portfolio Only</option>
                    <option value="none">No Proof</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {applicants
                  .filter(a => {
                    const matchesStatus = applicantFilter === 'all' || a.status === applicantFilter;
                    const matchesSearch = a.full_name.toLowerCase().includes(applicantSearch.toLowerCase());
                    const matchesType = applicantTypeFilter === 'all' || a.attachment_type === applicantTypeFilter;
                    return matchesStatus && matchesSearch && matchesType;
                  })
                  .map(applicant => (
                    <Card key={applicant.id} className="p-4 flex items-center gap-4 hover:border-neutral-300 transition-colors group">
                      <Avatar src={applicant.avatar_url} name={applicant.full_name} className="ring-2 ring-offset-2 ring-transparent group-hover:ring-black/5 transition-all" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm truncate">{applicant.full_name}</h4>
                          {applicant.attachment_type !== 'none' && (
                            <span className="bg-neutral-100 text-neutral-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              {applicant.attachment_type.replace('_', ' ')} Attached
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate uppercase font-mono">{applicant.headline}</p>
                        {aiApplicantsFeedback?.find(f => f.applicantId === applicant.user_id) && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                                <span className="text-[8px] font-bold text-blue-600 uppercase">AI Analysis</span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold",
                                (aiApplicantsFeedback.find(f => f.applicantId === applicant.user_id)?.score || 0) > 80 ? "text-green-600" : "text-blue-600"
                              )}>
                                {aiApplicantsFeedback.find(f => f.applicantId === applicant.user_id)?.score}%
                              </span>
                            </div>
                            <p className="text-[9px] text-blue-800 line-clamp-2 italic">
                              {aiApplicantsFeedback.find(f => f.applicantId === applicant.user_id)?.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                         {applicant.status === 'pending' && (
                           <Button onClick={() => updateApplicantStatus(applicant.id, 'shortlisted')} variant="outline" className="h-8 text-[10px] font-bold border-neutral-200 hover:border-black transition-colors px-4">Shortlist</Button>
                         )}
                         {applicant.status === 'shortlisted' && (
                           <span className="bg-black text-white px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-2">
                             <CheckCircle2 className="w-3 h-3" /> Shortlisted
                           </span>
                         )}
                         <Button 
                           variant="ghost" 
                           onClick={() => {
                             setSelectedUserId(applicant.user_id);
                             setIsRightOpen(true);
                             setActiveTab('profile');
                           }} 
                           className="h-8 text-[10px] font-bold text-neutral-400 hover:text-black"
                         >
                           Inspect Profile
                         </Button>
                      </div>
                    </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Job Alerts UI */}
              <div className="bg-gradient-to-br from-neutral-900 to-black rounded-3xl p-6 text-white shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Bell className="w-24 h-24 rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight">Personalized Alerts</h3>
                      <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-[0.2em] mt-1">Real-time matching engine</p>
                    </div>
                    {!showJobAlertForm && (
                      <Button onClick={() => setShowJobAlertForm(true)} className="bg-white text-black hover:bg-neutral-200 rounded-xl text-[10px] font-bold h-8 px-4">Create Alert</Button>
                    )}
                  </div>

                  {showJobAlertForm ? (
                    <div className="space-y-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">New Alert Criteria</span>
                        <button onClick={() => setShowJobAlertForm(false)} className="text-neutral-500 hover:text-white"><Plus className="w-4 h-4 rotate-45" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-[8px] font-bold text-neutral-500 uppercase ml-1">Keywords</label>
                            <input 
                              type="text" 
                              placeholder="e.g. React, Python" 
                              value={newJobAlert.keyword}
                              onChange={e => setNewJobAlert({...newJobAlert, keyword: e.target.value})}
                              className="w-full bg-white/10 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-white outline-none"
                            />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-bold text-neutral-500 uppercase ml-1">Location</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Remote, NY" 
                              value={newJobAlert.location}
                              onChange={e => setNewJobAlert({...newJobAlert, location: e.target.value})}
                              className="w-full bg-white/10 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-white outline-none"
                            />
                         </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-neutral-500 uppercase ml-1">Experience Level</label>
                        <select 
                          value={newJobAlert.experience_level}
                          onChange={e => setNewJobAlert({...newJobAlert, experience_level: e.target.value})}
                          className="w-full bg-white/10 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-white outline-none appearance-none"
                        >
                          <option value="all" className="bg-neutral-900">All Levels</option>
                          <option value="Junior" className="bg-neutral-900">Junior</option>
                          <option value="Mid" className="bg-neutral-900">Mid Level</option>
                          <option value="Senior" className="bg-neutral-900">Senior</option>
                          <option value="Lead" className="bg-neutral-900">Lead</option>
                        </select>
                      </div>
                      <Button onClick={createJobAlert} className="w-full bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-bold py-5">Enable Pulse Alert</Button>
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {jobAlerts.length === 0 ? (
                        <div className="text-[10px] text-neutral-500 italic py-2">No active alerts. Add one to see real-time matches.</div>
                      ) : (
                        jobAlerts.map(alert => (
                          <div key={alert.id} className="flex-shrink-0 bg-white/5 border border-white/10 p-3 rounded-2xl min-w-[140px] relative group/alert">
                            <button 
                              onClick={() => deleteJobAlert(alert.id)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/alert:opacity-100 transition-opacity"
                            >
                              <Plus className="w-2 h-2 rotate-45" />
                            </button>
                            <p className="text-[10px] font-bold truncate">{alert.keyword || 'All Topics'}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase font-mono">{alert.experience_level}</span>
                              {alert.location && <span className="text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase font-mono">{alert.location}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Oman Specific Filter Bar */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                <button
                  onClick={() => setSelectedPlaceId('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
                    selectedPlaceId === 'all' 
                      ? "bg-black border-black text-white shadow-lg" 
                      : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-300"
                  )}
                >
                  All Oman
                </button>
                {places.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => setSelectedPlaceId(place.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
                      selectedPlaceId === place.id 
                        ? "bg-black border-black text-white shadow-lg" 
                        : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-300"
                    )}
                  >
                    {place.name}
                  </button>
                ))}
              </div>

              {/* Job Filters */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <select 
                      value={jobFilters.experience}
                      onChange={e => setJobFilters({...jobFilters, experience: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-100 rounded-xl outline-none"
                    >
                      <option value="all">Level: All</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Min Salary ($k)</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="300" 
                    step="10"
                    value={jobFilters.minSalary || 0}
                    onChange={e => setJobFilters({...jobFilters, minSalary: e.target.value})}
                    className="flex-1 accent-black h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold w-12 text-right">${jobFilters.minSalary || 0}k</span>
                </div>
              </div>

              {currentUser?.is_company_rep === 1 && (
                <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
                  {!showJobForm ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm">Post a New Job</h3>
                        <p className="text-xs text-neutral-500">Reach verified professionals in our network.</p>
                      </div>
                      <Button onClick={() => setShowJobForm(true)} className="rounded-xl text-xs">Create Job</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-sm">Job Details</h3>
                        <Button variant="ghost" onClick={() => setShowJobForm(false)} className="text-neutral-400 h-6 px-2"><Plus className="w-4 h-4 rotate-45" /></Button>
                      </div>
                      <input type="text" placeholder="Job Title (e.g. Senior Backend Engineer)" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full text-xs p-3 rounded-lg border border-neutral-200" />
                      <div className="flex gap-2">
                        <input type="text" placeholder="Location (e.g. Remote)" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="w-2/5 text-xs p-3 rounded-lg border border-neutral-200" />
                        <input type="text" placeholder="Salary (e.g. $120k - $150k)" value={newJob.salary_range} onChange={e => setNewJob({...newJob, salary_range: e.target.value})} className="w-2/5 text-xs p-3 rounded-lg border border-neutral-200" />
                        <select value={newJob.experience_level} onChange={e => setNewJob({...newJob, experience_level: e.target.value})} className="w-1/5 text-xs p-3 rounded-lg border border-neutral-200 outline-none bg-white">
                          <option value="Junior">Junior</option>
                          <option value="Mid">Mid</option>
                          <option value="Senior">Senior</option>
                          <option value="Lead">Lead</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase ml-1">Application Deadline</label>
                        <input type="date" value={newJob.end_date} onChange={e => setNewJob({...newJob, end_date: e.target.value})} className="w-full text-xs p-3 rounded-lg border border-neutral-200" />
                      </div>
                      <textarea placeholder="Job Description & Requirements..." value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full text-xs p-3 rounded-lg border border-neutral-200 min-h-[100px]" />
                      <Button onClick={postJob} className="w-full rounded-xl" disabled={!newJob.title || !newJob.description}>Publish Job</Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <div className="text-center py-20 text-neutral-400">No jobs match your criteria.</div>
                ) : (
                  jobs.map(job => (
                    <div key={job.id} className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{job.title}</h3>
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-1.5 py-0.5 rounded">{job.experience_level}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-neutral-500 font-mono">
                            <span className="flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded-md"><Briefcase className="w-3 h-3" /> {job.company_name}</span>
                            <span className="flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded-md"><MapPin className="w-3 h-3" /> {job.location}</span>
                            {job.salary_range && <span className="flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded-md"><TrendingUp className="w-3 h-3 text-green-600" /> {job.salary_range}</span>}
                            {job.end_date && <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-100"><Award className="w-3 h-3" /> Closes: {new Date(job.end_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           {currentUser?.id === job.user_id && (
                             <Button onClick={() => fetchApplicants(job.id)} variant="outline" className="h-8 text-[10px] font-bold">Applicants</Button>
                           )}
                           {currentUser?.is_company_rep === 0 && (
                             applyingToJobId === job.id ? (
                               <div className="bg-neutral-50 border border-neutral-100 p-3 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-1 duration-300">
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Attach Professional Insight</p>
                                 <div className="flex gap-2 mb-3">
                                   <button 
                                     onClick={() => setAppAttachmentType(appAttachmentType === 'cv_item' ? 'none' : 'cv_item')}
                                     className={cn("p-2 rounded-lg border transition-all", appAttachmentType === 'cv_item' ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-200")}
                                     title="Attach CV Section"
                                   >
                                     <FileText className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => setAppAttachmentType(appAttachmentType === 'portfolio_item' ? 'none' : 'portfolio_item')}
                                     className={cn("p-2 rounded-lg border transition-all", appAttachmentType === 'portfolio_item' ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-200")}
                                     title="Attach Portfolio Item"
                                   >
                                     <Layers className="w-4 h-4" />
                                   </button>
                                 </div>
                                 
                                 {appAttachmentType === 'cv_item' && (
                                   <select 
                                     className="w-full text-[10px] bg-white border border-neutral-200 rounded-lg px-2 py-2 mb-3 outline-none"
                                     onChange={(e) => setAppAttachmentId(Number(e.target.value))}
                                   >
                                     <option value="">Select relevant experience...</option>
                                     {profileData?.cv?.map((item: any) => (
                                       <option key={item.id} value={item.id}>{item.title} at {item.subtitle}</option>
                                     ))}
                                   </select>
                                 )}

                                 {appAttachmentType === 'portfolio_item' && (
                                   <select 
                                     className="w-full text-[10px] bg-white border border-neutral-200 rounded-lg px-2 py-2 mb-3 outline-none"
                                     onChange={(e) => setAppAttachmentId(Number(e.target.value))}
                                   >
                                     <option value="">Select relevant project...</option>
                                     {profileData?.portfolio?.map((item: any) => (
                                       <option key={item.id} value={item.id}>{item.title}</option>
                                     ))}
                                   </select>
                                 )}

                                 <div className="flex gap-2">
                                   <Button onClick={applyToJob} className="flex-1 rounded-lg text-[10px] h-8 font-bold">Confirm</Button>
                                   <Button variant="ghost" onClick={() => setApplyingToJobId(null)} className="rounded-lg text-[10px] h-8">Cancel</Button>
                                 </div>
                               </div>
                             ) : (
                               <Button onClick={() => setApplyingToJobId(job.id)} className="rounded-xl text-xs font-bold shrink-0">Apply</Button>
                             )
                           )}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap mt-4 pt-4 border-t border-neutral-100">{job.description}</p>
                      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>Posted {formatDistanceToNow(new Date(job.created_at))} ago</span>
                        <span>Job ID: {job.id.toString().padStart(6, '0')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT COLUMN: PROFILE / NOTIFICATIONS VIEW */}
      <AnimatePresence>
        {isRightOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsRightOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
      <motion.aside 
        initial={false}
        animate={{ x: isRightOpen || windowWidth >= 1024 ? 0 : 380 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 right-0 w-[380px] max-w-[90%] bg-white border-l border-neutral-200 z-50 lg:static lg:translate-x-0 shadow-2xl lg:shadow-none shrink-0"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <select 
                className="text-[10px] bg-neutral-100 border-none rounded-lg px-2 py-1.5 outline-none text-neutral-500 font-mono hover:bg-neutral-200 transition-colors"
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                value={i18n.language}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="ar">AR</option>
              </select>
              
              <select 
                className="text-[10px] bg-neutral-100 border-none rounded-lg px-2 py-1.5 outline-none text-neutral-500 font-bold hover:bg-neutral-200 transition-colors"
                value={selectedPlaceId || 'all'}
                onChange={(e) => {
                  const pid = e.target.value === 'all' ? null : Number(e.target.value);
                  setSelectedPlaceId(pid);
                  if (currentUser) {
                    fetchAPI('/api/user/preference/place', {
                      method: 'POST',
                      body: JSON.stringify({ user_id: currentUser.id, place_id: pid })
                    });
                  }
                }}
              >
                <option value="all">{t('all_locations') || 'Oman (All)'}</option>
                {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            <button onClick={() => setIsRightOpen(false)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg text-neutral-300">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>

          {!currentUser ? (
            <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-white">
              <div className="flex justify-end items-center mb-6">
                 <button onClick={() => setIsRightOpen(false)} className="lg:hidden text-neutral-300">
                    <Plus className="w-5 h-5 rotate-45" />
                 </button>
              </div>

              <div className="flex justify-center mb-8">
                <div className="bg-black p-5 rounded-[28px] shadow-2xl shadow-black/20">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h1 className="text-2xl font-black text-center mb-1 tracking-tight">ProSync Oman</h1>
              <p className="text-neutral-400 text-center mb-8 text-sm font-medium">{t('verified_network_oman')}</p>
              
              <div className="space-y-4 max-w-sm mx-auto w-full">
                {authStep === 'email' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                      <input 
                        type="email" 
                        placeholder="example@work.om"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                        className="w-full pl-11 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all font-bold text-sm"
                      />
                    </div>
                    <Button 
                      onClick={handleCheckEmail}
                      disabled={isLoading}
                      className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Continue'}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}

                {authStep === 'password' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <button onClick={() => setAuthStep('email')} className="text-xs font-bold text-neutral-400 flex items-center gap-1 hover:text-black transition-colors">
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to Email
                    </button>
                    <div className="p-3 bg-neutral-50 rounded-xl flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black">
                         {email ? email[0].toUpperCase() : '?'}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Logging in as</p>
                         <p className="text-xs font-bold truncate">{email}</p>
                       </div>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        autoFocus
                        className="w-full pl-11 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                       <button onClick={handleForgotPassword} className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors">
                         Forgot Password?
                       </button>
                    </div>
                    <Button 
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Log In'}
                    </Button>
                  </motion.div>
                )}

                {authStep === 'register' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <button onClick={() => setAuthStep('email')} className="text-xs font-bold text-neutral-400 flex items-center gap-1 hover:text-black transition-colors">
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to Email
                    </button>
                    <p className="text-xs font-bold text-neutral-500">Create your ProSync identity</p>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black transition-all font-bold text-sm"
                      />
                      <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black transition-all font-bold text-sm"
                      />
                    </div>
                    <Button 
                      onClick={handleRegister}
                      disabled={isLoading}
                      className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Join the Network'}
                    </Button>
                  </motion.div>
                )}

                {authStep === 'verify' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="text-center">
                       <p className="text-xs font-bold text-neutral-500">OTP Verification</p>
                       <p className="text-[10px] text-neutral-400">We've sent a 6-digit code to {email}</p>
                    </div>
                    <input 
                      type="text" 
                      placeholder="0 0 0 0 0 0"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-5 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black text-center font-mono font-black text-2xl tracking-[0.5em]"
                    />
                    {debugOtp && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-700 font-mono text-center">
                        DEBUG OTP: {debugOtp}
                      </div>
                    )}
                    <Button 
                      onClick={handleVerifyOtp}
                      disabled={isLoading || otp.length < 6}
                      className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm transition-all"
                    >
                      {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                  </motion.div>
                )}

                {authStep === 'new_pass' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <p className="text-xs font-bold text-neutral-500 text-center">Set New Password</p>
                    <input 
                      type="password" 
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black transition-all font-bold text-sm"
                    />
                    <Button 
                      onClick={handleResetPassword}
                      disabled={isLoading}
                      className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm transition-all"
                    >
                      {isLoading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </motion.div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                    {error}
                  </motion.p>
                )}

                {/* DEV HELPERS */}
                <div className="mt-8 pt-8 border-t border-neutral-100 space-y-4">
                   <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest text-center">Protocol Seeds (Dev Mode)</p>
                   <div className="grid grid-cols-1 gap-2">
                     <button 
                       onClick={() => { setEmail('admin@prosync.com'); setPassword('Password123!'); setAuthStep('password'); }}
                       className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 hover:bg-neutral-100 transition-all text-left group"
                     >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black uppercase text-neutral-400">System Admin</p>
                            <p className="text-xs font-bold text-black">admin@prosync.com</p>
                          </div>
                          <Zap className="w-3 h-3 text-amber-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                     </button>
                     <button 
                       onClick={() => { setEmail('salim@omaninfra.com'); setPassword('Password123!'); setAuthStep('password'); }}
                       className="p-4 rounded-2xl bg-blue-50/30 border border-blue-100/50 hover:bg-blue-50 transition-all text-left group"
                     >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black uppercase text-blue-400">Pro Company User</p>
                            <p className="text-xs font-bold text-blue-900 line-clamp-1 text-ellipsis overflow-hidden">salim@omaninfra.com</p>
                          </div>
                          <Briefcase className="w-3 h-3 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                     </button>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* TAB BAR */}
              <div className="flex border-b border-neutral-100 p-2 gap-1 shrink-0 items-center">
                <button 
                  onClick={() => setIsRightOpen(false)}
                  className="p-2 hover:bg-neutral-100 rounded-xl text-neutral-400 lg:hidden"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                    activeTab === 'profile' ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50"
                  )}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Identity
                </button>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative",
                    activeTab === 'notifications' ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50"
                  )}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Activity
                  {notifications.some(n => !n.is_read) && (
                    <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('messages')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative",
                    activeTab === 'messages' ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Messages
                  {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) > 0 && (
                    <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-10">
                {activeTab === 'messages' ? (
                  <div className="space-y-6 h-full flex flex-col">
                    {!activeChatUser ? (
                      <>
                        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">Direct Syncs</h3>
                        {conversations.length === 0 ? (
                          <div className="text-center py-20 text-neutral-300 italic text-xs font-mono">NO_SYNCS_AVAILABLE</div>
                        ) : (
                          <div className="space-y-3">
                            {conversations.map(conv => (
                              <button 
                                key={conv.id} 
                                onClick={() => setActiveChatUser({ id: conv.id, full_name: conv.full_name, avatar_url: conv.avatar_url })}
                                className="w-full bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-3 text-left hover:border-neutral-300 transition-all"
                              >
                                <Avatar src={conv.avatar_url} name={conv.full_name} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs font-bold truncate">{conv.full_name}</p>
                                    {conv.last_message_time && (
                                      <span className="text-[8px] text-neutral-400">{formatDistanceToNow(new Date(conv.last_message_time))} ago</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate">{conv.last_message || "Start a conversation"}</p>
                                </div>
                                {conv.unread_count > 0 && (
                                  <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {conv.unread_count}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col h-full -mx-6 -mt-10 -mb-10">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3 bg-white shrink-0">
                          <button onClick={() => setActiveChatUser(null)} className="text-neutral-400 hover:text-black">
                            <ChevronRight className="w-4 h-4 rotate-180" />
                          </button>
                          <Avatar src={activeChatUser.avatar_url} name={activeChatUser.full_name} size="sm" />
                          <p className="text-xs font-bold">{activeChatUser.full_name}</p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/30">
                          {chatMessages.length === 0 ? (
                            <div className="text-center py-10 text-neutral-400 italic text-xs font-mono">No messages yet.</div>
                          ) : (
                            chatMessages.map(msg => (
                              <div key={msg.id} className={cn("flex", msg.sender_id === currentUser?.id ? "justify-end" : "justify-start")}>
                                <div className={cn("max-w-[75%] rounded-2xl p-3 text-xs", msg.sender_id === currentUser?.id ? "bg-black text-white rounded-br-sm" : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm")}>
                                  {msg.content}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
    
                        <div className="p-4 bg-white border-t border-neutral-100 shrink-0 flex gap-2">
                          <input 
                            type="text"
                            value={newChatMessage}
                            onChange={(e) => setNewChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                          />
                          <Button onClick={sendChatMessage} className="rounded-full px-4 text-xs font-bold h-9">Send</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'notifications' ? (
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">Pulse Notifications</h3>
                    {notifications.length === 0 ? (
                      <div className="text-center py-20 text-neutral-300 italic text-xs font-mono">NO_ACTIVITY_DETECTED</div>
                    ) : (
                      <div className="space-y-4">
                        {notifications.map(n => (
                          <Card key={n.id} className={cn("p-4 transition-all", !n.is_read ? "bg-white border-black/10 shadow-sm" : "bg-neutral-50/50 opacity-70")}>
                            <div className="flex gap-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", 
                                n.type === 'comment' ? "bg-blue-50 text-blue-500" : 
                                n.type === 'connection' ? "bg-purple-50 text-purple-500" : 
                                n.type.startsWith('job_') ? "bg-orange-50 text-orange-500" :
                                "bg-green-50 text-green-500"
                              )}>
                                {n.type === 'comment' ? <MessageSquare className="w-4 h-4" /> : 
                                 n.type === 'connection' ? <UserPlus className="w-4 h-4" /> : 
                                 n.type.startsWith('job_') ? <Briefcase className="w-4 h-4" /> :
                                 <Award className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-xs font-bold truncate">{n.title}</p>
                                  <span className="text-[8px] text-neutral-400 whitespace-nowrap">{formatDistanceToNow(new Date(n.created_at))} ago</span>
                                </div>
                                <p className="text-xs text-neutral-600 mb-3">{n.content}</p>
                                {!n.is_read && (
                                  <button 
                                    onClick={() => markAsRead(n.id)}
                                    className="text-[10px] font-bold text-black hover:opacity-70 flex items-center gap-1"
                                  >
                                    Mark as Read <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ) : profileData && (
                  <div className="space-y-6">
                    {isEditingProfile ? (
                       <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <header className="flex flex-col items-center text-center mb-8">
                           <Avatar src={profileData.avatar_url} name={profileData.full_name} size="lg" />
                           <h2 className="text-xl font-bold mt-4">Modify Synapse Node</h2>
                        </header>
                        <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Identity Headline</label>
                             <input 
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                              value={profileForm.headline}
                              onChange={e => setProfileForm({...profileForm, headline: e.target.value})}
                              placeholder="e.g. Senior Product Designer"
                            />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Neural Bio</label>
                             <textarea 
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs min-h-[120px] focus:ring-2 focus:ring-black outline-none transition-all"
                              value={profileForm.bio}
                              onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                              placeholder="Describe your capabilities..."
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button className="flex-1 h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest" onClick={updateProfile}>Lock Changes</Button>
                            <Button variant="ghost" className="h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest" onClick={() => setIsEditingProfile(false)}>Abort</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <ProfilePanel 
                        profileData={profileData}
                        currentUser={currentUser}
                        onEdit={() => {
                          if (profileData) {
                            setProfileForm({ 
                              headline: profileData.headline || '', 
                              bio: profileData.bio || '', 
                              avatar_url: profileData.avatar_url || '',
                              company_name: profileData.company_name || '',
                              company_description: profileData.company_description || '',
                              company_website: profileData.company_website || ''
                            });
                            setIsEditingProfile(true);
                          }
                        }}
                        onLogout={() => {
                          setCurrentUser(null);
                          setSelectedUserId(null);
                          setProfileData(null);
                          setActiveChatUser(null);
                          setIsRightOpen(false);
                          localStorage.removeItem('currentUser');
                        }}
                        onNavigateToAdmin={() => { navigate('/admin'); setIsRightOpen(false); }}
                        onSelectUserId={(id) => setSelectedUserId(id)}
                        onRequestSync={(id) => requestSync(id)}
                        onMessage={(user) => { setActiveTab('messages'); setActiveChatUser(user); }}
                        onAddCVItem={addCVItem}
                        onAddSkill={addSkill}
                        onAddPortfolioItem={addPortfolioItem}
                        onVerifySkill={verifySkill}
                      />
                    )}
                  </div>
                )}
            </div>
          </>
        )}
      </div>
    </motion.aside>

      {/* OVERLAY for closed mobile sidebars */}
      <AnimatePresence>
        {(isLeftOpen || isRightOpen) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsLeftOpen(false); setIsRightOpen(false); }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFileGallery && (
          <FileGallery 
            files={userFiles}
            galleryFilter={galleryFilter}
            setGalleryFilter={setGalleryFilter}
            onClose={() => setShowFileGallery(false)}
            onUpload={uploadFile}
            onDelete={deleteFile}
            onSelect={(file) => {
              setAttachmentType('portfolio_item');
              setAttachmentId(file.id);
              setShowFileGallery(false);
            }}
          />
        )}
      </AnimatePresence>
          </>
        } />
        <Route path="/admin" element={
          currentUser?.role === 'admin' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="p-4 border-b border-neutral-100 flex items-center gap-4 bg-white shrink-0">
                <Button onClick={() => navigate('/')} variant="ghost" className="text-xs font-bold">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Platform
                </Button>
                <div className="h-4 w-px bg-neutral-200" />
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">System Administration</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <AdminPanel currentUser={currentUser} />
              </div>
            </div>
          ) : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

const FileGallery = ({ 
  files, 
  onSelect, 
  onClose, 
  onUpload, 
  onDelete,
  galleryFilter,
  setGalleryFilter
}: { 
  files: FileItem[]; 
  onSelect: (file: FileItem) => void; 
  onClose: () => void;
  onUpload: (name: string, url: string, type: string, purpose: string) => void;
  onDelete: (id: number) => void;
  galleryFilter: string;
  setGalleryFilter: (f: string) => void;
}) => {
  const filteredFiles = galleryFilter === 'all' ? files : files.filter(f => f.purpose === galleryFilter);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-neutral-200">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 flex flex-col gap-6 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl overflow-x-auto scrollbar-hide">
              {['all', 'cv_item', 'portfolio_item', 'other'].map((f) => (
                <button
                  key={f}
                  onClick={() => setGalleryFilter(f)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-widest transition-all whitespace-nowrap",
                    galleryFilter === f ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {f.replace('_', ' ')}
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
                    onUpload(file.name, url, file.type, galleryFilter === 'all' ? 'other' : galleryFilter);
                  }
                }}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 min-h-[300px] pb-10 scrollbar-hide">
            {filteredFiles.length === 0 ? (
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
                    {file.type?.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="w-8 h-8 text-neutral-200" />
                        <span className="text-[8px] font-mono text-neutral-400 uppercase">{file.type.split('/')[1] || 'FILE'}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold truncate mb-1">{file.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{file.purpose.replace('_', ' ')}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
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
          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-[0.2em] text-center">Your files are stored securely and verified by ProSync</p>
        </footer>
      </motion.div>
    </div>
  );
};

