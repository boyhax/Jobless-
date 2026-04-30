import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Globe
} from 'lucide-react';
import { cn, fetchAPI } from './lib/utils';
import { User, Post, CVSection, Skill, PortfolioItem, Comment } from './types';
import { formatDistanceToNow } from 'date-fns';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-neutral-800',
    secondary: 'bg-neutral-100 text-black hover:bg-neutral-200',
    outline: 'border border-neutral-300 hover:bg-neutral-50',
    ghost: 'hover:bg-neutral-100 text-neutral-600',
  };
  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm', className)}>
    {children}
  </div>
);

const Avatar = ({ src, name, size = 'md', className }: { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-20 h-20 text-xl' };
  return (
    <div className={cn('rounded-full bg-neutral-200 flex items-center justify-center font-medium text-neutral-600 overflow-hidden shrink-0 border border-neutral-100', sizes[size], className)}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : name.charAt(0)}
    </div>
  );
};

// --- Views ---

const PostCard = ({ post, onComment, isExpanded, currentUser, onApply }: { post: Post; onComment: (postId: number) => void; isExpanded?: boolean; currentUser: User; onApply: (postId: number) => void }) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const loadComments = async () => {
    const data = await fetchAPI(`/api/posts/${post.id}/comments`);
    setComments(data);
  };

  useEffect(() => {
    if (isExpanded) loadComments();
  }, [isExpanded]);

  const submitComment = async () => {
    if (!newComment) return;
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

        {isHiring && post.user_id !== currentUser.id && (
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const [verifyingSkillName, setVerifyingSkillName] = useState<string | null>(null);
  const [verificationUrlInput, setVerificationUrlInput] = useState('');

  const login = async (email: string) => {
    try {
      const user = await fetchAPI('/api/auth/login', { 
        method: 'POST', 
        body: JSON.stringify({ email }) 
      });
      setCurrentUser(user);
      setSelectedUserId(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    login('demo@prosync.com');
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

  const addSkill = async () => {
    if (!currentUser) return;
    await fetchAPI('/api/skills', {
      method: 'POST',
      body: JSON.stringify({ ...skillForm, user_id: currentUser.id })
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

  const addPortfolioItem = async () => {
    if (!currentUser) return;
    await fetchAPI('/api/portfolio', {
      method: 'POST',
      body: JSON.stringify({ ...portfolioForm, user_id: currentUser.id })
    });
    fetchProfile(currentUser.id);
    setShowPortfolioForm(false);
  };

  const addCVItem = async () => {
    if (!currentUser) return;
    try {
      await fetchAPI('/api/cv', {
        method: 'POST',
        body: JSON.stringify({ ...cvForm, user_id: currentUser.id })
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

  const [attachmentType, setAttachmentType] = useState<'none' | 'cv_item' | 'link' | 'discussion'>('none');
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [postContent, setPostContent] = useState('');

  const submitPost = async () => {
    if (!postContent || !currentUser) return;
    await fetchAPI('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: currentUser.id, 
        content: postContent,
        attachment_type: attachmentType === 'none' ? null : attachmentType,
        attachment_id: attachmentId 
      })
    });
    setPostContent('');
    setAttachmentType('none');
    setAttachmentId(null);
    fetchFeed();
  };

  if (!currentUser) return <div className="flex items-center justify-center h-screen bg-neutral-50 font-mono text-neutral-400">SYNCING_IDENTITY...</div>;

  return (
    <div className="h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200 flex overflow-hidden">
      
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
        animate={{ x: isLeftOpen || window.innerWidth >= 768 ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-white border-r border-neutral-200 z-50 md:static md:translate-x-0 shadow-2xl md:shadow-none shrink-0"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <header className="mb-8 items-center justify-between flex">
            <h2 className="text-xl font-bold tracking-tighter italic">ProSync.</h2>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setIsLeftOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg md:hidden text-neutral-400"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
              <select 
                className="text-[10px] bg-neutral-100 border-none rounded-lg px-2 py-1 outline-none text-neutral-500 font-mono hover:bg-neutral-200 transition-colors"
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                value={i18n.language}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <select 
                className="text-[10px] bg-neutral-100 border-none rounded-lg px-2 py-1 outline-none text-neutral-500 font-mono"
                onChange={(e) => login(e.target.value)}
                value={currentUser.email}
              >
                <option value="demo@prosync.com">{t('App.user_demo')}</option>
                <option value="recruiter@techcorp.com">{t('App.user_recruiter')}</option>
              </select>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('App.trending_pulse')}</h3>
                <Hash className="w-3 h-3 text-neutral-300" />
              </div>
              <div className="flex flex-wrap gap-2">
                {['#hiring', '#engineering', '#design', '#ai', '#remote', '#career', '#leadership', '#web3', '#rust'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setSearchQuery(tag === searchQuery ? '' : tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                      searchQuery === tag 
                        ? "bg-black border-black text-white shadow-lg shadow-black/10" 
                        : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-300 hover:text-black"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Top Nodes</h3>
                <Users className="w-3 h-3 text-neutral-300" />
              </div>
              <div className="space-y-3">
                {candidates.map(candidate => (
                  <button 
                    key={candidate.id} 
                    onClick={() => { setSelectedUserId(candidate.id); setIsRightOpen(true); }}
                    className="flex items-center gap-3 w-full p-2 hover:bg-neutral-50 rounded-xl transition-all text-left"
                  >
                    <Avatar src={candidate.avatar_url} name={candidate.full_name} size="sm" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold truncate">{candidate.full_name}</p>
                      <p className="text-[10px] text-neutral-400 truncate uppercase font-mono">{candidate.headline?.split('|')[0]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {recommendations.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Recommended Syncs</h3>
                  <UserPlus className="w-3 h-3 text-neutral-300" />
                </div>
                <div className="space-y-3">
                  {recommendations.map(candidate => (
                    <div key={candidate.id} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                      <button 
                        onClick={() => { setSelectedUserId(candidate.id); setIsRightOpen(true); }}
                        className="flex items-center gap-3 flex-1 overflow-hidden text-left"
                      >
                        <Avatar src={candidate.avatar_url} name={candidate.full_name} size="sm" />
                        <div className="flex-1 overflow-hidden pr-2">
                          <p className="text-xs font-bold truncate">{candidate.full_name}</p>
                          <p className="text-[10px] text-neutral-400 truncate uppercase font-mono mb-1">{candidate.headline?.split('|')[0]}</p>
                          <p className="text-[9px] font-bold text-blue-500 uppercase flex items-center gap-1">
                            <Code className="w-3 h-3" /> {candidate.shared_skills_count} Shared Skills
                          </p>
                        </div>
                      </button>
                      <Button variant="outline" className="px-2 py-1 h-auto text-[10px]" onClick={() => requestSync(candidate.id)}>Sync</Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-black text-white p-5 rounded-2xl">
              <p className="text-[10px] text-white/50 mb-1">{t('App.network_strength')}</p>
              <div className="items-end gap-2 hidden md:flex">
                <span className="text-3xl font-mono leading-none">{candidates.length}</span>
                <span className="text-xs pb-1 opacity-70">{t('App.verified_professionals')}</span>
              </div>
            </section>
          </div>
        </div>
      </motion.aside>

      {/* CENTER COLUMN: THE FEED */}
      <main className="flex-1 h-full overflow-y-auto bg-neutral-50 relative">
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
          {/* Integrated Search Console */}
          <div className="flex items-center gap-3 mb-8">
            <button 
              onClick={() => setIsLeftOpen(true)} 
              className={cn(
                "p-2 hover:bg-neutral-200/50 rounded-full transition-all md:hidden",
                isLeftOpen && "hidden"
              )}
            >
              <Menu className="w-5 h-5 text-neutral-600" />
            </button>
            
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
              <input 
                type="text" 
                placeholder={t('App.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-2xl pl-12 pr-28 py-3 text-sm focus:ring-4 focus:ring-black/5 focus:border-neutral-300 transition-all outline-none shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <div className="w-[1px] h-4 bg-neutral-200 mr-1" />
                <select 
                  className="text-[9px] bg-transparent border-none rounded-lg px-2 py-1.5 outline-none text-neutral-500 font-bold uppercase tracking-widest hover:text-black transition-colors cursor-pointer appearance-none"
                  value={searchType}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setSearchType(val);
                    if (val === 'jobs') setActiveMainTab('jobs');
                    else if (val === 'all' || val === 'posts' || val === 'users') setActiveMainTab('feed');
                  }}
                >
                  <option value="all">Global</option>
                  <option value="posts">Feed</option>
                  <option value="jobs">Jobs</option>
                  <option value="users">Users</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => { setSelectedUserId(currentUser.id); setIsRightOpen(true); }} 
              className="shrink-0 hover:opacity-80 transition-opacity md:hidden"
            >
              <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
            </button>
          </div>

          {activeMainTab === 'feed' ? (
            <div className="space-y-6">
              {/* Search Results Facets */}
              {searchQuery && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {searchResults.jobs?.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Jobs</h3>
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
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Organizations</h3>
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
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Users</h3>
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
              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden p-4">
                <div className="flex gap-3 mb-4">
                  <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
                  <textarea 
                    placeholder="What's moving in your career? Use #tags or /attach..." 
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="flex-1 border-none focus:ring-0 text-xs py-2 min-h-[60px] resize-none"
                  />
                </div>

                {attachmentType !== 'none' && (
                  <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-black rotate-45 cursor-pointer" onClick={() => setAttachmentType('none')} />
                      <span className="text-[10px] font-bold uppercase tracking-tight text-neutral-400">Attached: {attachmentType.replace('_', ' ')}</span>
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

                <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                  <div className="flex gap-1 md:gap-2">
                    <button 
                      onClick={() => setAttachmentType('cv_item')}
                      className={cn("p-2 rounded-lg transition-all", attachmentType === 'cv_item' ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50")}
                      title="Attach CV Item"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setAttachmentType('link')}
                      className={cn("p-2 rounded-lg transition-all", attachmentType === 'link' ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50")}
                      title="Attach External Link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setAttachmentType('discussion')}
                      className={cn("p-2 rounded-lg transition-all", attachmentType === 'discussion' ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50")}
                      title="Start Discussion"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                  <Button 
                    variant="primary" 
                    disabled={!postContent}
                    onClick={submitPost}
                    className="rounded-xl px-6 text-xs h-9"
                  >
                    Post
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser}
                    onApply={applyToJob}
                    isExpanded={expandedPost === post.id}
                    onComment={(id) => setExpandedPost(expandedPost === id ? null : id)} 
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
                <Button variant="ghost" onClick={() => setActiveMainTab('jobs')} className="text-xs">
                  Back to Jobs
                </Button>
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
      <motion.aside 
        initial={false}
        animate={{ x: isRightOpen || window.innerWidth >= 1024 ? 0 : 450 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 right-0 w-[450px] max-w-[90%] bg-white border-l border-neutral-200 z-50 md:static md:translate-x-0 shadow-2xl md:shadow-none shrink-0"
        )}
      >
        <div className="h-full flex flex-col">
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
              <div className="space-y-12">
              <header className="flex flex-col items-center text-center">
                 <button onClick={() => setIsRightOpen(false)} className="md:hidden self-end mb-4 text-neutral-300"><Plus className="w-5 h-5 rotate-45" /></button>
                 <Avatar src={profileData.avatar_url} name={profileData.full_name} size="lg" />
                 
                 {isEditingProfile ? (
                   <div className="mt-6 w-full space-y-3">
                     <input 
                       className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold"
                       value={profileForm.headline}
                       onChange={e => setProfileForm({...profileForm, headline: e.target.value})}
                       placeholder="Headline (e.g. Senior Product Designer)"
                     />
                     <textarea 
                       className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs min-h-[80px]"
                       value={profileForm.bio}
                       onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                       placeholder="Short bio..."
                     />
                     <div className="flex gap-2">
                       <Button className="flex-1 text-[10px]" onClick={updateProfile}>Save</Button>
                       <Button variant="ghost" className="text-[10px]" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                     </div>
                   </div>
                 ) : (
                   <div className="mt-6">
                      <div className="flex items-center justify-center gap-2 mb-1">
                         {profileData.is_company_rep === 1 && profileData.company_name ? (
                          <button 
                            onClick={() => fetchProfile(profileData.id)}
                            className="text-2xl font-bold tracking-tight hover:text-black/70 transition-colors"
                          >
                            {profileData.company_name}
                          </button>
                        ) : (
                          <h2 className="text-2xl font-bold tracking-tight">{profileData.full_name}</h2>
                        )}
                         <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest">{profileData.headline}</p>

                       {profileData.is_company_rep === 1 && (
                         <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                           {profileData.company_website && (
                             <a 
                               href={profileData.company_website} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-[10px] text-blue-500 hover:underline flex items-center justify-center gap-1"
                             >
                               <Globe className="w-3 h-3" />
                               {profileData.company_website.replace(/^https?:\/\//, '')}
                             </a>
                           )}
                           {profileData.company_description && (
                             <p className="text-[10px] text-neutral-600 max-w-xs mx-auto italic">
                               {profileData.company_description}
                             </p>
                           )}
                         </div>
                       )}
                   </div>
                 )}
              </header>

              <div className="flex justify-center gap-2">
                 {profileData.id === currentUser.id ? (
                   <Button 
                    variant="outline" 
                    className="text-[10px] uppercase font-bold tracking-wider rounded-xl"
                    onClick={() => {
                      setProfileForm({ 
                        headline: profileData.headline || '', 
                        bio: profileData.bio || '', 
                        avatar_url: profileData.avatar_url || '',
                        company_name: profileData.company_name || '',
                        company_description: profileData.company_description || '',
                        company_website: profileData.company_website || ''
                      });
                      setIsEditingProfile(true);
                    }}
                  >
                    Edit Bio
                  </Button>
                 ) : (
                   <>
                     <Button variant="primary" className="text-[10px] uppercase font-bold tracking-wider rounded-xl" onClick={() => requestSync(profileData.id)}>Request Synergy</Button>
                     <Button variant="outline" className="px-3" onClick={() => { setActiveTab('messages'); setActiveChatUser({ id: profileData.id, full_name: profileData.full_name, avatar_url: profileData.avatar_url }); }}>
                       <MessageSquare className="w-4 h-4" />
                     </Button>
                   </>
                 )}
                 <Button variant="ghost" className="text-[10px] uppercase font-bold tracking-wider" onClick={() => setSelectedUserId(currentUser.id)}><UserIcon className="w-4 h-4" /></Button>
              </div>

               {profileData.id === currentUser.id && profileData.analytics && (
                 <div className="mt-8 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center group hover:border-neutral-300 transition-all">
                      <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 text-neutral-400">{t('Profile.views')}</p>
                      <p className="text-xl font-mono leading-none font-bold text-black">{profileData.analytics.profile_views}</p>
                      <TrendingUp className="w-3 h-3 text-green-500 mx-auto mt-2" />
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center group hover:border-neutral-300 transition-all">
                      <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 text-neutral-400">{t('Profile.synths_recv')}</p>
                      <p className="text-xl font-mono leading-none font-bold text-black">{profileData.analytics.connections_received}</p>
                      <AtSign className="w-3 h-3 text-black mx-auto mt-2" />
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center group hover:border-neutral-300 transition-all">
                      <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 text-neutral-400">{t('Profile.engagement')}</p>
                      <p className="text-xl font-mono leading-none font-bold text-black">{profileData.analytics.engagement}</p>
                      <MessageSquare className="w-3 h-3 text-neutral-400 mx-auto mt-2" />
                    </div>
                 </div>
               )}

               <section className="mt-12">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{profileData.is_company_rep === 1 ? 'Company Chronicles' : 'Career Trajectory'}</h3>
                  {profileData.id === currentUser.id && (
                    <button 
                      onClick={() => setShowCVForm(!showCVForm)}
                      className={cn("p-1.5 rounded-lg transition-colors", showCVForm ? "bg-black text-white" : "bg-neutral-50 text-neutral-400 hover:text-black")}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showCVForm && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-8"
                    >
                      <div className="space-y-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <select 
                          value={cvForm.type}
                          onChange={e => setCvForm({...cvForm, type: e.target.value})}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                        >
                          <option value="experience">Professional Experience</option>
                          <option value="education">Education</option>
                          <option value="project">Key Project</option>
                          <option value="certification">Certification</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Role or Degree Title" 
                          value={cvForm.title}
                          onChange={e => setCvForm({...cvForm, title: e.target.value})}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                        />
                        <input 
                          type="text" 
                          placeholder="Company or Institution" 
                          value={cvForm.subtitle}
                          onChange={e => setCvForm({...cvForm, subtitle: e.target.value})}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                        />
                        <div className="flex gap-2">
                           <input 
                            type="date" 
                            title="Start Date"
                            value={cvForm.start_date}
                            onChange={e => setCvForm({...cvForm, start_date: e.target.value})}
                            className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[10px] focus:ring-1 focus:ring-black outline-none"
                          />
                          <input 
                            type="date" 
                            title="End Date"
                            value={cvForm.end_date}
                            onChange={e => setCvForm({...cvForm, end_date: e.target.value})}
                            className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[10px] focus:ring-1 focus:ring-black outline-none"
                          />
                        </div>
                        <textarea 
                          placeholder="Verification or Portable Keywords (comma separated)" 
                          value={cvForm.description}
                          onChange={e => setCvForm({...cvForm, description: e.target.value})}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none min-h-[80px]"
                        />
                        <input 
                          type="url" 
                          placeholder="Verification Link (URL)" 
                          value={cvForm.verification_url}
                          onChange={e => setCvForm({...cvForm, verification_url: e.target.value})}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                        />
                        <div className="flex gap-2 pt-2">
                          <Button 
                            className="flex-1 text-[10px] uppercase tracking-widest h-9" 
                            onClick={addCVItem}
                            disabled={!cvForm.title || !cvForm.subtitle || !cvForm.start_date}
                          >
                            Verify & Update
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="px-4 text-[10px] uppercase font-bold text-neutral-400"
                            onClick={() => setShowCVForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-100">
                  {profileData.cv?.map((item: CVSection) => (
                    <div key={item.id} className="pl-8 relative group">
                      <div className="absolute left-0 top-1 w-6 h-6 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center z-10 group-hover:border-black transition-all">
                        {item.type === 'experience' ? <Briefcase className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                      </div>
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="text-xs font-bold truncate pr-4">{item.title}</p>
                        <span className="text-[9px] font-mono text-neutral-400 whitespace-nowrap">{item.start_date.split('-')[0]}</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mb-2">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              </section>

              {profileData.is_company_rep === 1 && profileData.jobs?.length > 0 && (
                <section className="mt-12 bg-black rounded-3xl p-6 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Briefcase className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6">Job Opportunities</h3>
                    <div className="space-y-4">
                      {profileData.jobs.map((job: any) => (
                        <div key={job.id} className="group cursor-pointer border-b border-white/10 pb-4 last:border-0 hover:border-white/30 transition-all">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-xs font-bold group-hover:text-neutral-300">{job.title}</h4>
                            <span className="text-[8px] font-mono text-neutral-500 bg-white/5 px-1 rounded uppercase tracking-widest">{job.experience_level}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[8px] text-neutral-400 uppercase font-bold tracking-widest">
                            <span className="flex items-center gap-1"><MapPin className="w-2 h-2" />{job.location}</span>
                            <span>{job.salary_range}</span>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-2 line-clamp-2">{job.description}</p>
                          <Button 
                             onClick={() => setActiveMainTab('jobs')}
                             variant="ghost" 
                             className="text-[8px] p-0 h-auto mt-2 text-white hover:text-white/80"
                          >
                             Apply Now <ChevronRight className="w-2 h-2 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Verified Skills</h3>
                  {profileData.id === currentUser.id && (
                    <button onClick={() => setShowSkillForm(!showSkillForm)} className="text-neutral-400 hover:text-black"><Plus className="w-3 h-3" /></button>
                  )}
                </div>
                
                {showSkillForm && (
                  <div className="mb-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <input 
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                      placeholder="Skill Name (e.g. React)..."
                      value={skillForm.name}
                      onChange={e => setSkillForm({...skillForm, name: e.target.value})}
                    />
                    <input 
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono"
                      placeholder="Verification URL (Credential Link)..."
                      value={skillForm.verification_url}
                      onChange={e => setSkillForm({...skillForm, verification_url: e.target.value})}
                    />
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Skill Proficiency</span>
                      <input 
                        type="range" min="1" max="5" 
                        value={skillForm.proficiency}
                        onChange={e => setSkillForm({...skillForm, proficiency: parseInt(e.target.value)})}
                        className="w-24 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 text-[10px] h-9 font-bold uppercase tracking-wider" onClick={addSkill}>Secure Node</Button>
                      <Button variant="ghost" className="text-[10px] h-9 font-bold text-neutral-400 uppercase" onClick={() => setShowSkillForm(false)}>Discard</Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {profileData.skills?.map((skill: Skill) => (
                    <div key={skill.name} className="flex flex-col gap-1">
                      <div className={cn(
                        "group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all",
                        skill.is_verified ? "bg-black text-white" : "bg-neutral-50 border border-neutral-100 text-neutral-700 hover:border-neutral-200"
                      )}>
                        <span>{skill.name}</span>
                        <span className="opacity-40">{skill.proficiency}/5</span>
                        {skill.is_verified ? (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        ) : profileData.id === currentUser.id ? (
                          <button 
                            onClick={() => {
                              setVerifyingSkillName(skill.name);
                              setVerificationUrlInput('');
                            }}
                            className="bg-black/10 hover:bg-black/20 p-0.5 rounded text-[8px] transition-colors"
                          >
                            VERIFY
                          </button>
                        ) : null}
                        
                        {skill.verification_url && (
                          <a 
                            href={skill.verification_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-1 opacity-60 hover:opacity-100"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      {verifyingSkillName === skill.name && (
                        <div className="mt-2 p-3 bg-white border border-neutral-200 rounded-xl shadow-lg z-10 animate-in fade-in zoom-in-95">
                          <p className="text-[8px] font-bold text-neutral-400 uppercase mb-2">Prove Expertise</p>
                          <input 
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] mb-2 outline-none focus:ring-1 focus:ring-black"
                            placeholder="Link to Certificate/Project"
                            value={verificationUrlInput}
                            onChange={(e) => setVerificationUrlInput(e.target.value)}
                          />
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                verifySkill(skill.name, verificationUrlInput);
                                setVerifyingSkillName(null);
                              }}
                              className="flex-1 bg-black text-white rounded-lg py-1 text-[9px] font-bold"
                            >
                              Sync Proof
                            </button>
                            <button 
                              onClick={() => setVerifyingSkillName(null)}
                              className="px-2 py-1 text-[9px] text-neutral-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Showcase</h3>
                   {profileData.id === currentUser.id && (
                     <button onClick={() => setShowPortfolioForm(!showPortfolioForm)} className="text-neutral-400 hover:text-black"><Plus className="w-3 h-3" /></button>
                   )}
                 </div>

                 {showPortfolioForm && (
                   <div className="mb-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3">
                     <input 
                       className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                       placeholder="Project Title..."
                       value={portfolioForm.title}
                       onChange={e => setPortfolioForm({...portfolioForm, title: e.target.value})}
                     />
                     <textarea 
                       className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                       placeholder="Discovery Details..."
                       value={portfolioForm.description}
                       onChange={e => setPortfolioForm({...portfolioForm, description: e.target.value})}
                     />
                     <input 
                       className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                       placeholder="Project URL..."
                       value={portfolioForm.url}
                       onChange={e => setPortfolioForm({...portfolioForm, url: e.target.value})}
                     />
                     <div className="flex gap-2">
                       <Button className="flex-1 text-[10px] h-8" onClick={addPortfolioItem}>Add Portfolio</Button>
                       <Button variant="ghost" className="text-[10px] h-8 font-bold text-neutral-400" onClick={() => setShowPortfolioForm(false)}>Cancel</Button>
                     </div>
                   </div>
                 )}

                 <div className="grid grid-cols-1 gap-4">
                      {profileData.portfolio.map((item: PortfolioItem) => (
                        <Card key={item.id} className="p-4 border-none bg-neutral-50 hover:bg-neutral-100 transition-all cursor-pointer">
                           <p className="text-xs font-bold mb-1">{item.title}</p>
                           <p className="text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>
                        </Card>
                      ))}
                   </div>
                </section>
            </div>
          )}
        </div>
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
    </div>
  );
}

