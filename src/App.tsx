import { formatDistanceToNow, isValid } from "date-fns";
import {
  ArrowRight,
  Award,
  Bell,
  Briefcase,
  ChevronRight,
  FileText,
  FolderOpen,
  Hash,
  Link as LinkIcon,
  Menu,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  User as UserIcon,
  UserPlus,
  Users,
  Vote,
  Wand2,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AdminPanel } from "./components/AdminPanel";
import {
  AuthPanel,
  EditPostModal,
  FileGallery,
  JobsFeature,
  MarkdownEditor,
  PostCard,
} from "./components/features";
import { ProfilePanel } from "./components/ProfilePanel";
import { SetupPage } from "./components/SetupPage";
import { Avatar } from "./components/ui/Avatar";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { cn } from "./lib/utils";
import { geminiService } from "./services/aiClient";
import * as api from "./services/api";
import type {
  FileItem,
  Post,
  User
} from "./types";

const normalizeUserId = (id: string | number) => {
  const raw = String(id || "").trim();
  if (!raw) return "";
  return raw.includes(":") ? raw : `users:${raw}`;
};

export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("currentUser");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(
    null,
  );
  const [profileData, setProfileData] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | number | null>(null);
  const [unfoldPostId, setUnfoldPostId] = useState<string | number | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<
    "feed" | "jobs" | "applicants"
  >("feed");
  const [searchType, setSearchType] = useState<
    "posts" | "jobs" | "users" | null
  >(null);
  const [searchResults, setSearchResults] = useState<any>({
    posts: [],
    jobs: [],
    users: [],
  });
  const [selectedJobId, setSelectedJobId] = useState<string | number | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantFilter, setApplicantFilter] = useState<
    "all" | "pending" | "shortlisted"
  >("all");
  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantTypeFilter, setApplicantTypeFilter] = useState<
    "all" | "cv_item" | "portfolio_item" | "none"
  >("all");
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobFilters, setJobFilters] = useState({
    q: "",
    experience: "all",
    minSalary: "",
  });
  const [applyingToJobId, setApplyingToJobId] = useState<string | number | null>(null);
  const [appAttachmentType, setAppAttachmentType] = useState<
    "cv_item" | "portfolio_item" | "none"
  >("none");
  const [appAttachmentId, setAppAttachmentId] = useState<string | number | null>(null);
  const [jobAlerts, setJobAlerts] = useState<any[]>([]);
  const [showJobAlertForm, setShowJobAlertForm] = useState(false);
  const [newJobAlert, setNewJobAlert] = useState({
    keyword: "",
    experience_level: "all",
    location: "",
  });

  // Job form states
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    location: "",
    description: "",
    salary_range: "",
    experience_level: "Mid",
    end_date: "",
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "notifications" | "messages"
  >("profile");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");

  // Mobile drawer states
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [leftSidebarView, setLeftSidebarView] = useState<
    "discovery" | "profile"
  >("discovery");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
  }, []);

  const [verifyingSkillName, setVerifyingSkillName] = useState<string | null>(
    null,
  );
  const [verificationUrlInput, setVerificationUrlInput] = useState("");

  // AI States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [bioAiInstruction, setBioAiInstruction] = useState("");
  const [isBioAiLoading, setIsBioAiLoading] = useState(false);
  const [aiApplicantsFeedback, setAiApplicantsFeedback] = useState<
    any[] | null
  >(null);
  const [aiOptimizedPost, setAiOptimizedPost] = useState<any>(null);

  // Slash Command and Interactive Elements
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [showFileGallery, setShowFileGallery] = useState(false);
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<string>("all");
  const [topics, setTopics] = useState<string[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | number | "all">(
    "all",
  );
  const [postQuiz, setPostQuiz] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
  } | null>(null);
  const [postPoll, setPostPoll] = useState<{
    question: string;
    options: string[];
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [authStep, setAuthStep] = useState<
    "email" | "password" | "register" | "forgot" | "verify" | "new_pass"
  >("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handleCheckEmail = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.auth.checkEmail(email);
      if (res.exists) {
        setAuthStep("password");
      } else {
        setAuthStep("register");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await api.auth.login(email, password);
      completeLogin(user);
    } catch (err: any) {
      handleFetchError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      const user = await api.auth.register(email, password, fullName);
      completeLogin(user);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.auth.forgotPassword(email);
      setDebugOtp(res.debug_otp); // For demo
      setAuthStep("verify");
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.verifyOtp(email, otp);
      setAuthStep("new_pass");
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.resetPassword(email, otp, newPassword);
      setAuthStep("password");
      setPassword("");
      alert("Password reset successfully. Please login.");
    } catch (err: any) {
      setError(err.message || "Reset failed");
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
    setAuthStep("email");
    setEmail("");
    setPassword("");
    setFullName("");
    setOtp("");
    setNewPassword("");
    setDebugOtp(null);
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setSelectedUserId(null);
    setProfileData(null);
    setActiveChatUser(null);
    setIsRightOpen(false);
    setIsConnected(false);
    navigate("/");
  };

  const handleFetchError = (err: any) => {
    if (
      err.message &&
      (err.message.includes("401") || err.message.includes("Unauthorized"))
    ) {
      logout();
    }
    setError(err.message);
  };
  const fetchPlaces = async () => {
    try {
      const data = await api.places.list();
      setPlaces(data);
    } catch (e) {
      console.error(e);
    }
  };

  const login = async (loginEmail: string) => {
    try {
      const user = await api.auth.login(loginEmail, '');
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
      alert(t("login_failed_try_seeded"));
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  const checkSession = async () => {
    if (!currentUser) return;
    try {
      const freshUser = await api.auth.me();
      if (freshUser && freshUser.id) {
        setCurrentUser((prev: any) => ({ ...prev, ...freshUser }));
        localStorage.setItem("currentUser", JSON.stringify({ ...currentUser, ...freshUser }));
      }
    } catch (err) {
      console.error("Session verification failed, logging out", err);
      logout();
    }
  };

  const fetchTopics = async () => {
    try {
      const data = await api.topics.list();
      setTopics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkSetupStatus = async () => {
    try {
      const data = await api.setup.status();
      setIsSetupNeeded(!data.initialized);
    } catch (err) {
      console.error("Setup check failed", err);
    } finally {
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    checkSetupStatus();
    checkSession();
    fetchPlaces();
    fetchTopics();
    fetchRecommendations();
    if (currentUser) {
      if (!selectedUserId) setSelectedUserId(currentUser.id);
      if (currentUser.place_id && selectedPlaceId === "all") {
        setSelectedPlaceId(currentUser.place_id);
      }
      fetchFeed();
      fetchConversations();
      fetchNotifications();
    }

    // Listen for storage events to sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "currentUser" && !e.newValue) {
        logout();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth-unauthorized", logout);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("auth-unauthorized", logout);
    };
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
      const data = await api.messages.conversations(currentUser.id);
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatMessages = async (targetId: string | number) => {
    if (!currentUser) return;
    try {
      const data = await api.messages.thread(currentUser.id, targetId);
      setChatMessages(data);
      if (activeTab === "messages" && !activeChatUser) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendChatMessage = async () => {
    if (!currentUser || !activeChatUser || !newChatMessage.trim()) return;
    try {
      await api.messages.send(currentUser.id, activeChatUser.id, newChatMessage);
      setNewChatMessage("");
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

    return undefined;
  }, [currentUser]);

  useEffect(() => {
    if (activeChatUser) {
      fetchChatMessages(activeChatUser.id);
      const interval = setInterval(
        () => fetchChatMessages(activeChatUser.id),
        5000,
      );
      return () => clearInterval(interval);
    }

    return undefined;
  }, [activeChatUser]);

  const fetchSearch = async () => {
    if (!searchQuery && !searchType) {
      fetchFeed();
      return;
    }
    setLoading(true);
    try {
      const data = await api.search.all(searchQuery, searchType || 'all');
      setSearchResults(data);
      setPosts(data.posts || []);
      setJobs(data.jobs || []);
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
      const data = await api.posts.feed();
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (jobId: string | number) => {
    try {
      const data = await api.jobs.applicants(jobId);
      setApplicants(data);
      setSelectedJobId(jobId);
      setActiveMainTab("applicants");
    } catch (err) {
      console.error(err);
    }
  };

  const updateApplicantStatus = async (appId: number, status: string) => {
    await api.jobs.updateApplicationStatus(appId, status);
    if (selectedJobId) fetchApplicants(selectedJobId);
  };

  const fetchProfile = async (id: number | string) => {
    setProfileData(null);
    setIsConnected(false);
    setIsProfileLoading(true);
    try {
      const profileId = normalizeUserId(id);
      if (!profileId) throw new Error("Invalid profile id");
      const data = await api.profile.get(profileId, currentUser?.id ? normalizeUserId(currentUser.id) : undefined);
      if (!data || data.error) {
        throw new Error(data.error || "User not found");
      }
      setProfileData(data);
      if (
        currentUser &&
        normalizeUserId(currentUser.id) !== profileId
      ) {
        try {
          const connStatus = await api.connections.status(normalizeUserId(currentUser.id), profileId);
          setIsConnected(connStatus.connected);
        } catch (e) {
          console.warn("Connection status check failed:", e);
        }
      }
    } catch (err: any) {
      console.error("Fetch profile failed:", err);
      if (currentUser && id === currentUser.id) {
        handleFetchError(err);
      } else {
        setError(err.message || "Profile not found");
      }
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleToggleConnection = async (targetId: string | number) => {
    if (!currentUser) return;
    try {
      if (isConnected) {
        await api.connections.remove(currentUser.id, String(targetId));
        setIsConnected(false);
      } else {
        await api.connections.create(currentUser.id, targetId);
        setIsConnected(true);
      }
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const data = await api.candidates.list(searchQuery);
      setCandidates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const data = await api.recommendations.get(currentUser?.id);
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await api.jobs.list({
        q: searchType === 'jobs' ? searchQuery : jobFilters.q,
        experience: jobFilters.experience,
        minSalary: jobFilters.minSalary,
        placeId: selectedPlaceId !== 'all' ? selectedPlaceId.toString() : undefined,
      });
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    if (currentUser) {
      fetchJobs();
    }
  }, [currentUser, jobFilters, searchQuery, searchType]);

  const applyToJob = async () => {
    if (!currentUser || !applyingToJobId) return;
    const res = await api.jobs.apply(currentUser.id, applyingToJobId, appAttachmentType, appAttachmentId);
    alert(res.message || "Application sent successfully!");
    setApplyingToJobId(null);
    setAppAttachmentType("none");
    setAppAttachmentId(null);
  };

  const postJob = async () => {
    if (!currentUser || !newJob.title || !newJob.description) return;
    try {
      await api.jobs.create({
        user_id: currentUser.id,
        company_name: currentUser.full_name,
        ...newJob,
      });
      setNewJob({
        title: "",
        location: "",
        description: "",
        salary_range: "",
        experience_level: "Mid",
        end_date: "",
      });
      setShowJobForm(false);
      fetchJobs();
      fetchFeed();
    } catch (err: any) {
      alert(err.message || "Failed to post job. Please ensure you have permissions.");
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserFiles = async () => {
    if (!currentUser) return;
    try {
      const data = await api.files.list(currentUser.id);
      setUserFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFile = async (
    name: string,
    url: string,
    type: string,
    purpose: string,
  ) => {
    if (!currentUser) return;
    try {
      await api.files.upload(currentUser.id, name, url, type, purpose);
      fetchUserFiles();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFile = async (fileId: string | number) => {
    try {
      await api.files.delete(fileId);
      fetchUserFiles();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobAlerts = async () => {
    if (!currentUser) return;
    try {
      const data = await api.jobAlerts.list(currentUser.id);
      setJobAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const createJobAlert = async () => {
    if (!currentUser) return;
    try {
      await api.jobAlerts.create(currentUser.id, newJobAlert);
      setNewJobAlert({ keyword: "", experience_level: "all", location: "" });
      setShowJobAlertForm(false);
      fetchJobAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteJobAlert = async (id: string | number) => {
    try {
      await api.jobAlerts.delete(id);
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

    return undefined;
  }, [currentUser]);

  const markAsRead = async (id: number) => {
    await api.notifications.markRead(id);
    fetchNotifications();
  };

  // AI Functionality
  const handleAiRankJobs = async () => {
    if (!searchQuery && jobFilters.q === "") return;
    setIsAiLoading(true);
    try {
      const ranked = await geminiService.rankJobs(
        jobs,
        searchQuery || jobFilters.q,
      );
      setJobs(ranked);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiShortlistApplicants = async () => {
    if (!selectedJobId) return;
    const currentJob = jobs.find((j) => j.id === selectedJobId);
    if (!currentJob) return;

    setIsAiLoading(true);
    try {
      const feedback = await geminiService.shortlistApplicants(
        currentJob.description,
        applicants,
      );
      setAiApplicantsFeedback(feedback);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiMagicPost = async (instruction?: string) => {
    setIsAiLoading(true);
    try {
      const result = await geminiService.magicPost(postContent, instruction, {
        onChunk: (_chunk, fullText) => {
          if (fullText) setPostContent(fullText);
        },
      });
      if (result) {
        setAiOptimizedPost(result);
        setPostContent(result.optimizedContent);
        setShowAiPrompt(false);
        setAiInstruction("");
      }
    } catch (err) {
      console.error("AI Magic failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiBio = async (instruction: string) => {
    if (!currentUser) return;
    const newBio = await geminiService.magicBio(profileData?.bio || "", instruction);
    if (newBio) {
      await api.profile.update(currentUser.id, { bio: newBio });
      setProfileForm(prev => ({ ...prev, bio: newBio }));
      fetchProfile(currentUser.id);
    }
  };

  const handleAiGenerateInteractive = async (type: "quiz" | "poll") => {
    if (!postContent) return;
    setIsAiLoading(true);
    try {
      const result = await geminiService.generateInteractiveContent(
        postContent,
        type,
      );
      if (result) {
        if (type === "quiz") setPostQuiz(result);
        else setPostPoll(result);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePostResponse = async (
    postId: string | number,
    type: "quiz" | "poll",
    index: number,
  ) => {
    try {
      await api.posts.respond(postId, currentUser!.id, type, index);
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
    type: "experience",
    title: "",
    subtitle: "",
    description: "",
    start_date: "",
    end_date: "",
    verification_url: "",
    keywords: "",
  });

  const [skillForm, setSkillForm] = useState({
    name: "",
    proficiency: 3,
    verification_url: "",
  });
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    url: "",
    description: "",
    thumbnail_url: "",
  });
  const [profileForm, setProfileForm] = useState({
    headline: "",
    bio: "",
    avatar_url: "",
    company_name: "",
    company_description: "",
    company_website: "",
  });

  const updateProfile = async () => {
    if (!currentUser) return;
    try {
      const resp = await api.profile.update(currentUser.id, profileForm);
      if (resp.success) {
        // Refresh profile data in panel
        fetchProfile(currentUser.id);
        // Also update currentUser so navbar reflects changes immediately
        const updatedUser = { ...currentUser, ...profileForm };
        setCurrentUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setIsEditingProfile(false);
      }
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    }
  };

  const addSkill = async (skillData?: any) => {
    if (!currentUser) return;
    const data = skillData || skillForm;
    await api.skills.add(currentUser.id, data);
    fetchProfile(currentUser.id);
    setShowSkillForm(false);
    setSkillForm({ name: "", proficiency: 3, verification_url: "" });
  };

  const verifySkill = async (skillName: string, url: string) => {
    if (!currentUser || !url) return;
    await api.skills.verify(currentUser.id, skillName, url);
    fetchProfile(currentUser.id);
  };

  const addPortfolioItem = async (pData?: any) => {
    if (!currentUser) return;
    const data = pData || portfolioForm;
    await api.portfolio.add(currentUser.id, data);
    fetchProfile(currentUser.id);
    setShowPortfolioForm(false);
  };

  const addCVItem = async (cData?: any) => {
    if (!currentUser) return;
    const data = cData || cvForm;
    try {
      await api.cv.add(currentUser.id, data);
      fetchProfile(currentUser.id);
      setShowCVForm(false);
      setCvForm({
        type: "experience",
        title: "",
        subtitle: "",
        description: "",
        start_date: "",
        end_date: "",
        verification_url: "",
        keywords: "",
      });
      fetchFeed(); // Refresh feed since CV updates create posts
    } catch (err) {
      console.error(err);
    }
  };

  const [attachmentType, setAttachmentType] = useState<
    "none" | "cv_item" | "portfolio_item" | "link" | "discussion"
  >("none");
  const [attachmentId, setAttachmentId] = useState<string | number | null>(null);
  const [postContent, setPostContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | number | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");

  const handleDeletePost = async (postId: string | number) => {
    try {
      await api.posts.delete(postId);
      // Refresh posts
      if (searchQuery) {
        fetchSearch();
      } else {
        const data = await api.posts.feed();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete post");
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPostId || !editingPostContent) return;
    try {
      await api.posts.update(editingPostId, editingPostContent);
      setEditingPostId(null);
      setEditingPostContent("");
      // Refresh posts
      if (searchQuery) {
        fetchSearch();
      } else {
        const data = await api.posts.feed();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to update post");
    }
  };
  const [isPostFocused, setIsPostFocused] = useState(false);

  const submitPost = async () => {
    if ((!postContent && !postQuiz && !postPoll) || !currentUser) return;
    await api.posts.create({
      user_id: currentUser.id,
      content: postContent,
      attachment_type: attachmentType === 'none' ? null : attachmentType,
      attachment_id: attachmentId,
      quiz_data: postQuiz,
      poll_data: postPoll,
    });
    setPostContent("");
    setAttachmentType("none");
    setAttachmentId(null);
    setPostQuiz(null);
    setPostPoll(null);
    setAiOptimizedPost(null);
    fetchFeed();
  };

  if (setupLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-900/10 border-t-neutral-900 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
            {t("App.establishing_synapse")}
          </p>
        </div>
      </div>
    );
  }

  if (isSetupNeeded) {
    return <SetupPage onComplete={() => checkSetupStatus()} />;
  }

  return (
    <div
      className={cn(
        "h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200 flex overflow-hidden",
        i18n.language === "ar" ? "flex-row-reverse" : "flex-row",
      )}
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      <Routes>
        <Route
          path="/"
          element={
            <>
              <EditPostModal
                isOpen={Boolean(editingPostId)}
                content={editingPostContent}
                onContentChange={setEditingPostContent}
                onClose={() => setEditingPostId(null)}
                onSave={handleUpdatePost}
              />
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
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={cn(
                  "fixed inset-y-0 left-0 w-80 bg-white border-r border-neutral-200 z-50 md:static md:translate-x-0 shadow-2xl md:shadow-none shrink-0",
                )}
              >
                <div className="h-full flex flex-col p-6">
                  <header className="mb-8 items-center justify-between flex shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-black p-2 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-white" />
                      </div>
                      <h1 className="text-lg font-black tracking-tighter">
                        ProSync Oman
                      </h1>
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
                          {t("App.trending_pulse") || "Trending Pulse"}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {topics.map((topic) => (
                            <button
                              key={topic}
                              onClick={() => {
                                setSearchQuery(topic);
                                setActiveMainTab("feed");
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
                          {recommendations?.length > 0 ? (
                            recommendations.map((contact) => (
                              <div
                                key={contact.id}
                                onClick={() => {
                                  setSelectedUserId(contact.id);
                                  setActiveTab("profile");
                                  setIsRightOpen(true);
                                  setIsLeftOpen(false);
                                }}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group"
                              >
                                <Avatar
                                  src={contact.avatar_url}
                                  name={contact.full_name || contact.name}
                                  size="sm"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-neutral-900 truncate">
                                    {contact.full_name || contact.name}
                                  </p>
                                  <p className="text-[9px] text-neutral-400 uppercase tracking-tight">
                                    {contact.headline || contact.role}
                                  </p>
                                </div>
                                <Plus className="w-3.5 h-3.5 text-neutral-300 group-hover:text-black transition-colors" />
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                              <p className="text-[10px] text-neutral-400 text-center font-bold uppercase tracking-widest leading-relaxed">
                                No discovery nodes found.<br />Sync more to explore.
                              </p>
                            </div>
                          )}
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
                          isLeftOpen && "hidden",
                        )}
                      >
                        <Menu className="w-5 h-5 text-neutral-600" />
                      </button>

                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                        <input
                          type="text"
                          placeholder={t("App.search_placeholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-2xl pl-12 pr-12 py-3 text-sm focus:ring-4 focus:ring-black/5 focus:border-neutral-300 transition-all outline-none shadow-sm"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          {searchType === "jobs" && (
                            <button
                              onClick={handleAiRankJobs}
                              disabled={isAiLoading || !searchQuery}
                              className="p-2 text-blue-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
                              title={t("App.ai_rank")}
                            >
                              <Sparkles
                                className={cn(
                                  "w-4 h-4",
                                  isAiLoading && "animate-spin",
                                )}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (currentUser) {
                            setSelectedUserId(currentUser.id);
                            setActiveTab("profile");
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
                            <Avatar
                              src={currentUser.avatar_url}
                              name={currentUser.full_name}
                              size="sm"
                            />
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                              title="Online"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                              {t("Platform.join_network") || "Join the Network"}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border border-black shadow-lg shadow-black/10">
                              <Plus className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Search Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                      {[
                        { id: "posts", label: t("posts") },
                        { id: "jobs", label: t("jobs") },
                        { id: "users", label: t("users") },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            if (searchType === tab.id) {
                              setSearchType(null);
                            } else {
                              setSearchType(tab.id as any);
                            }
                            if (tab.id === "jobs") setActiveMainTab("jobs");
                            else if (["posts", "users"].includes(tab.id))
                              setActiveMainTab("feed");
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                            searchType === tab.id
                              ? "bg-black text-white shadow-md shadow-black/10 scale-105"
                              : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100",
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeMainTab === "feed" ? (
                    <div className="space-y-6">
                      {/* Search Results Facets */}
                      {searchQuery && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                          {searchResults.jobs?.length > 0 && (
                            <section>
                              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                                {t("App.jobs") || "Jobs"}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {searchResults.jobs.map((j: any) => (
                                  <Card
                                    key={j.id}
                                    className="p-4 bg-white/50 backdrop-blur-sm border-dashed border-2"
                                  >
                                    <h4 className="font-bold text-sm">
                                      {j.title}
                                    </h4>
                                    <p className="text-[10px] text-neutral-500">
                                      {j.company_name}
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-[8px] font-mono text-neutral-400">
                                        {j.location}
                                      </span>
                                      <Button
                                        onClick={() => setActiveMainTab("jobs")}
                                        variant="ghost"
                                        className="h-6 text-[8px] p-0"
                                      >
                                        View Jobs
                                      </Button>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </section>
                          )}

                          {searchResults.users?.some(
                            (u: any) => u.is_company_rep,
                          ) && (
                              <section>
                                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                                  {t("App.organizations") || "Organizations"}
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                  {searchResults.users
                                    .filter((u: any) => u.is_company_rep)
                                    .map((u: any) => (
                                      <button
                                        key={u.id}
                                        onClick={() => {
                                          setSelectedUserId(u.id);
                                          setActiveTab("profile");
                                          setIsRightOpen(true);
                                        }}
                                        className="flex-shrink-0 w-32 flex flex-col items-center text-center group"
                                      >
                                        <div className="relative">
                                          <Avatar
                                            src={u.avatar_url}
                                            name={u.full_name}
                                            size="md"
                                          />
                                          <div className="absolute -bottom-1 -right-1 bg-black text-white p-1 rounded-full border border-white">
                                            <Briefcase className="w-2 h-2" />
                                          </div>
                                        </div>
                                        <p className="text-[10px] font-bold mt-2 truncate w-full">
                                          {u.full_name}
                                        </p>
                                        <p className="text-[8px] text-neutral-400 truncate w-full uppercase">
                                          Verified Org
                                        </p>
                                      </button>
                                    ))}
                                </div>
                              </section>
                            )}

                          {searchResults.users?.some(
                            (u: any) => !u.is_company_rep,
                          ) && (
                              <section>
                                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                                  {t("App.users") || "Users"}
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                  {searchResults.users
                                    .filter((u: any) => !u.is_company_rep)
                                    .map((u: any) => (
                                      <button
                                        key={u.id}
                                        onClick={() => {
                                          setSelectedUserId(u.id);
                                          setActiveTab("profile");
                                          setIsRightOpen(true);
                                        }}
                                        className="flex-shrink-0 w-32 flex flex-col items-center text-center group"
                                      >
                                        <Avatar
                                          src={u.avatar_url}
                                          name={u.full_name}
                                          size="md"
                                        />
                                        <p className="text-[10px] font-bold mt-2 truncate w-full">
                                          {u.full_name}
                                        </p>
                                        <p className="text-[8px] text-neutral-400 truncate w-full uppercase font-mono">
                                          {u.headline?.split("|")[0]}
                                        </p>
                                      </button>
                                    ))}
                                </div>
                              </section>
                            )}
                        </div>
                      )}

                      {/* Box to Post */}
                      {currentUser && !searchQuery && (
                        <div className="bg-white rounded-2xl shadow-sm transition-all duration-300 relative px-4 pt-4 pb-2">
                          <div className="flex gap-3">
                            <Avatar
                              src={currentUser.avatar_url}
                              name={currentUser.full_name}
                              size="sm"
                            />
                            <div className="flex-1 flex flex-col relative min-h-[44px]">
                              <textarea
                                placeholder="What's moving in your career? Use #tags or / to add quiz/poll..."
                                value={postContent}
                                onFocus={() => setIsPostFocused(true)}
                                onBlur={() => {
                                  // Delay blur to allow clicking menu items
                                  setTimeout(
                                    () => setIsPostFocused(false),
                                    200,
                                  );
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPostContent(val);
                                  if (val.endsWith("/")) {
                                    setShowSlashMenu(true);
                                  } else if (
                                    showSlashMenu &&
                                    !val.includes("/")
                                  ) {
                                    setShowSlashMenu(false);
                                  }
                                }}
                                className={cn(
                                  "w-full border-none focus:ring-0 text-xs py-2 resize-y transition-all duration-300 bg-transparent",
                                  isPostFocused
                                    ? "min-h-[120px]"
                                    : "min-h-[44px]",
                                )}
                              />

                              {showSlashMenu && (
                                <div className="absolute left-0 bottom-full mb-2 bg-white border border-neutral-200 rounded-xl shadow-xl p-1 z-50 min-w-[140px] animate-in fade-in slide-in-from-bottom-2">
                                  <p className="px-3 py-1.5 text-[7px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-50">
                                    Career Interactive
                                  </p>
                                  <button
                                    onClick={() => {
                                      setPostPoll({
                                        question: "",
                                        options: ["", ""],
                                      });
                                      setPostContent(
                                        postContent.replace(/\/$/, ""),
                                      );
                                      setShowSlashMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors text-left"
                                  >
                                    <Vote className="w-3 h-3 text-blue-500" />
                                    Create Poll
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPostQuiz({
                                        question: "",
                                        options: ["", ""],
                                        correctIndex: 0,
                                      });
                                      setPostContent(
                                        postContent.replace(/\/$/, ""),
                                      );
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
                              <div
                                className={cn(
                                  "flex items-center justify-between mt-2 pt-2 transition-all border-t border-neutral-50",
                                  isPostFocused
                                    ? "opacity-100"
                                    : "opacity-60 scale-95 origin-left",
                                )}
                              >
                                <div className="flex items-center gap-1 relative">
                                  <button
                                    onClick={() =>
                                      setShowAttachMenu(!showAttachMenu)
                                    }
                                    className={cn(
                                      "p-1.5 rounded-lg transition-all flex items-center gap-2 shrink-0",
                                      showAttachMenu
                                        ? "bg-black text-white"
                                        : "text-neutral-400 hover:bg-neutral-100",
                                    )}
                                    title="Attach Item"
                                  >
                                    <Plus
                                      className={cn(
                                        "w-3.5 h-3.5 transition-transform",
                                        showAttachMenu && "rotate-45",
                                      )}
                                    />
                                    <span className="text-[9px] font-bold hidden md:inline uppercase tracking-widest">
                                      Attach
                                    </span>
                                  </button>

                                  {showAttachMenu && (
                                    <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                      <button
                                        onClick={() => {
                                          setAttachmentType("cv_item");
                                          setShowAttachMenu(false);
                                        }}
                                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                        title="CV Entry"
                                      >
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">
                                          CV
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAttachmentType("link");
                                          setShowAttachMenu(false);
                                        }}
                                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                        title="External Link"
                                      >
                                        <LinkIcon className="w-4 h-4 text-purple-500" />
                                        <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">
                                          Link
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowFileGallery(true);
                                          setShowAttachMenu(false);
                                          fetchUserFiles();
                                        }}
                                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                        title="My Files"
                                      >
                                        <FolderOpen className="w-4 h-4 text-orange-500" />
                                        <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">
                                          Files
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPostPoll({
                                            question: "",
                                            options: ["", ""],
                                          });
                                          setShowAttachMenu(false);
                                        }}
                                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group flex items-center gap-1.5"
                                        title="Poll"
                                      >
                                        <Vote className="w-4 h-4 text-green-500" />
                                        <span className="text-[8px] font-bold text-neutral-400 uppercase hidden sm:inline">
                                          Poll
                                        </span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="h-3 w-[1px] bg-neutral-100 mx-1" />

                                  <button
                                    onClick={() =>
                                      setShowAiPrompt(!showAiPrompt)
                                    }
                                    disabled={isAiLoading}
                                    className={cn(
                                      "p-1.5 rounded-lg transition-all flex items-center gap-2 text-purple-600 hover:bg-purple-50",
                                      showAiPrompt &&
                                      "bg-purple-50 shadow-inner",
                                    )}
                                    title={t("ai_command")}
                                  >
                                    <Sparkles
                                      className={cn(
                                        "w-3.5 h-3.5",
                                        isAiLoading && "animate-spin",
                                      )}
                                    />
                                    <span className="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">
                                      {t("ai_command")}
                                    </span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={
                                      (!postContent &&
                                        !postQuiz &&
                                        !postPoll) ||
                                      isAiLoading
                                    }
                                    onClick={submitPost}
                                    className="px-4 py-1.5 bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] hover:bg-neutral-800 disabled:opacity-30 transition-all flex items-center gap-2"
                                  >
                                    {t("publish")}
                                  </button>
                                </div>
                              </div>

                              {showAiPrompt && (
                                <div className="mt-3 p-1 bg-purple-50/50 rounded-xl flex items-center gap-2 border border-purple-100 animate-in fade-in slide-in-from-top-1">
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder={t(
                                      "ai_instruction_placeholder",
                                    )}
                                    className="flex-1 bg-transparent border-none text-[11px] px-3 py-1.5 outline-none font-medium placeholder:text-purple-300 text-purple-900"
                                    value={aiInstruction}
                                    onChange={(e) =>
                                      setAiInstruction(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" &&
                                      handleAiMagicPost(aiInstruction)
                                    }
                                  />
                                  <button
                                    onClick={() =>
                                      handleAiMagicPost(aiInstruction)
                                    }
                                    disabled={isAiLoading || !aiInstruction}
                                    className="bg-purple-500 text-white p-1.5 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-30"
                                  >
                                    {isAiLoading ? (
                                      <Wand2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowAiPrompt(false);
                                      setAiInstruction("");
                                    }}
                                    className="text-neutral-400 hover:text-neutral-600 p-1.5 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-2">
                            {/* Poll Builder */}
                            {postPoll && (
                              <div className="mb-4 p-4 bg-blue-50/30 border border-blue-100 rounded-xl animate-in zoom-in-95">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Vote className="w-4 h-4 text-blue-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                                      Career Poll
                                    </span>
                                  </div>
                                  <X
                                    className="w-4 h-4 text-neutral-400 cursor-pointer"
                                    onClick={() => setPostPoll(null)}
                                  />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Ask a question..."
                                  className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2 text-[10px] mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                                  value={postPoll.question}
                                  onChange={(e) =>
                                    setPostPoll({
                                      ...postPoll,
                                      question: e.target.value,
                                    })
                                  }
                                />
                                <div className="space-y-2">
                                  {postPoll.options.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder={`Option ${i + 1}`}
                                        className="flex-1 bg-white border border-blue-50 rounded-lg px-3 py-1.5 text-[10px] focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={opt}
                                        onChange={(e) => {
                                          const newOpts = [...postPoll.options];
                                          newOpts[i] = e.target.value;
                                          setPostPoll({
                                            ...postPoll,
                                            options: newOpts,
                                          });
                                        }}
                                      />
                                      {(postPoll?.options?.length || 0) > 2 && (
                                        <button
                                          onClick={() =>
                                            setPostPoll({
                                              ...postPoll,
                                              options: postPoll.options.filter(
                                                (_, idx) => idx !== i,
                                              ),
                                            })
                                          }
                                          className="text-neutral-300 hover:text-red-500"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {(postPoll?.options?.length || 0) < 5 && (
                                    <button
                                      onClick={() =>
                                        setPostPoll({
                                          ...postPoll,
                                          options: [...postPoll.options, ""],
                                        })
                                      }
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
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">
                                      Career Quiz
                                    </span>
                                  </div>
                                  <X
                                    className="w-4 h-4 text-neutral-400 cursor-pointer"
                                    onClick={() => setPostQuiz(null)}
                                  />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Enter quiz question..."
                                  className="w-full bg-white border border-yellow-100 rounded-lg px-3 py-2 text-[10px] mb-2 focus:ring-1 focus:ring-yellow-500 outline-none"
                                  value={postQuiz.question}
                                  onChange={(e) =>
                                    setPostQuiz({
                                      ...postQuiz,
                                      question: e.target.value,
                                    })
                                  }
                                />
                                <div className="space-y-2">
                                  {postQuiz.options.map((opt, i) => (
                                    <div
                                      key={i}
                                      className="flex gap-2 items-center"
                                    >
                                      <input
                                        type="radio"
                                        checked={postQuiz.correctIndex === i}
                                        onChange={() =>
                                          setPostQuiz({
                                            ...postQuiz,
                                            correctIndex: i,
                                          })
                                        }
                                        className="w-3 h-3 text-yellow-500"
                                      />
                                      <input
                                        type="text"
                                        placeholder={`Option ${i + 1}`}
                                        className={cn(
                                          "flex-1 bg-white border border-yellow-50 rounded-lg px-3 py-1.5 text-[10px] focus:ring-1 focus:ring-yellow-500 outline-none",
                                          postQuiz.correctIndex === i &&
                                          "border-yellow-300 ring-1 ring-yellow-300",
                                        )}
                                        value={opt}
                                        onChange={(e) => {
                                          const newOpts = [...postQuiz.options];
                                          newOpts[i] = e.target.value;
                                          setPostQuiz({
                                            ...postQuiz,
                                            options: newOpts,
                                          });
                                        }}
                                      />
                                      {(postQuiz?.options?.length || 0) > 2 && (
                                        <button
                                          onClick={() =>
                                            setPostQuiz({
                                              ...postQuiz,
                                              options: postQuiz.options.filter(
                                                (_, idx) => idx !== i,
                                              ),
                                            })
                                          }
                                          className="text-neutral-300 hover:text-red-500"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {(postQuiz?.options?.length || 0) < 5 && (
                                    <button
                                      onClick={() =>
                                        setPostQuiz({
                                          ...postQuiz,
                                          options: [...postQuiz.options, ""],
                                        })
                                      }
                                      className="text-[10px] font-bold text-yellow-500 hover:underline flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add Option
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {attachmentType !== "none" && (
                              <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                  <X
                                    className="w-4 h-4 text-neutral-400 cursor-pointer hover:text-black"
                                    onClick={() => setAttachmentType("none")}
                                  />
                                  <span className="text-[10px] font-bold uppercase tracking-tight text-neutral-500">
                                    Attached: {attachmentType.replace("_", " ")}
                                  </span>
                                </div>
                                {attachmentType === "cv_item" &&
                                  profileData?.cv && (
                                    <select
                                      className="text-[10px] bg-white border border-neutral-200 rounded-lg px-2 py-1 outline-none"
                                      onChange={(e) =>
                                        setAttachmentId(e.target.value)
                                      }
                                    >
                                      <option value="">
                                        Select CV Entry...
                                      </option>
                                      {profileData?.cv?.map((item: any) => (
                                        <option key={item.id} value={item.id}>
                                          {item.title} at {item.subtitle}
                                        </option>
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
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                              AI Content Assist
                            </span>
                          </div>

                          {aiOptimizedPost.quiz && (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">
                                Suggested Quiz
                              </p>
                              <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                                <p className="text-xs font-bold mb-2">
                                  {aiOptimizedPost.quiz.question}
                                </p>
                                <div className="space-y-1">
                                  {aiOptimizedPost.quiz.options.map(
                                    (opt: string, i: number) => (
                                      <div
                                        key={i}
                                        className="text-[10px] p-2 bg-neutral-50 rounded-lg border border-neutral-100"
                                      >
                                        {opt}
                                      </div>
                                    ),
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setPostQuiz(aiOptimizedPost.quiz);
                                    setAiOptimizedPost({
                                      ...aiOptimizedPost,
                                      quiz: null,
                                    });
                                  }}
                                  className="mt-2 w-full py-1.5 bg-yellow-50 text-yellow-600 rounded-lg text-[9px] font-bold uppercase hover:bg-yellow-100"
                                >
                                  Use this Quiz
                                </button>
                              </div>
                            </div>
                          )}

                          {aiOptimizedPost.poll && (
                            <div>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">
                                Suggested Poll
                              </p>
                              <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                                <p className="text-xs font-bold mb-2">
                                  {aiOptimizedPost.poll.question}
                                </p>
                                <div className="space-y-1">
                                  {aiOptimizedPost.poll.options.map(
                                    (opt: string, i: number) => (
                                      <div
                                        key={i}
                                        className="text-[10px] p-2 bg-neutral-50 rounded-lg border border-neutral-100"
                                      >
                                        {opt}
                                      </div>
                                    ),
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setPostPoll(aiOptimizedPost.poll);
                                    setAiOptimizedPost({
                                      ...aiOptimizedPost,
                                      poll: null,
                                    });
                                  }}
                                  className="mt-2 w-full py-1.5 bg-green-50 text-green-600 rounded-lg text-[9px] font-bold uppercase hover:bg-green-100"
                                >
                                  Use this Poll
                                </button>
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
                        {posts?.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            currentUser={currentUser}
                            onApply={applyToJob}
                            onDelete={handleDeletePost}
                            onEdit={(id, content) => {
                              setEditingPostId(id);
                              setEditingPostContent(content);
                            }}
                            isExpanded={expandedPost === post.id}
                            onComment={(id) =>
                              setExpandedPost(expandedPost === id ? null : id)
                            }
                            onRespond={handlePostResponse}
                            onSelectUser={(id) => {
                              setSelectedUserId(id);
                              setActiveTab("profile");
                              setIsRightOpen(true);
                            }}
                            isUnfolded={unfoldPostId === post.id}
                            onUnfold={setUnfoldPostId}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <JobsFeature
                      view={activeMainTab === "applicants" ? "applicants" : "jobs"}
                      onViewChange={setActiveMainTab}
                      selectedJobId={selectedJobId}
                      isAiLoading={isAiLoading}
                      onAiShortlistApplicants={handleAiShortlistApplicants}
                      applicantFilter={applicantFilter}
                      setApplicantFilter={setApplicantFilter}
                      applicantSearch={applicantSearch}
                      setApplicantSearch={setApplicantSearch}
                      applicantTypeFilter={applicantTypeFilter}
                      setApplicantTypeFilter={setApplicantTypeFilter}
                      applicants={applicants}
                      aiApplicantsFeedback={aiApplicantsFeedback}
                      onUpdateApplicantStatus={updateApplicantStatus}
                      onInspectApplicant={(userId) => {
                        setSelectedUserId(userId);
                        setIsRightOpen(true);
                        setActiveTab("profile");
                      }}
                      jobAlerts={jobAlerts}
                      showJobAlertForm={showJobAlertForm}
                      setShowJobAlertForm={setShowJobAlertForm}
                      newJobAlert={newJobAlert}
                      setNewJobAlert={setNewJobAlert}
                      onCreateJobAlert={createJobAlert}
                      onDeleteJobAlert={deleteJobAlert}
                      selectedPlaceId={selectedPlaceId}
                      setSelectedPlaceId={setSelectedPlaceId}
                      places={places}
                      jobFilters={jobFilters}
                      setJobFilters={setJobFilters}
                      currentUser={currentUser}
                      showJobForm={showJobForm}
                      setShowJobForm={setShowJobForm}
                      newJob={newJob}
                      setNewJob={setNewJob}
                      onPostJob={postJob}
                      jobs={jobs}
                      onFetchApplicants={fetchApplicants}
                      applyingToJobId={applyingToJobId}
                      setApplyingToJobId={setApplyingToJobId}
                      appAttachmentType={appAttachmentType}
                      setAppAttachmentType={setAppAttachmentType}
                      setAppAttachmentId={setAppAttachmentId}
                      profileData={profileData}
                      onApplyToJob={applyToJob}
                    />
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
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={cn(
                  "fixed inset-y-0 right-0 w-[380px] max-w-[90%] bg-white border-l border-neutral-200 z-50 lg:static lg:translate-x-0 shadow-2xl lg:shadow-none shrink-0",
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
                        value={selectedPlaceId || "all"}
                        onChange={(e) => {
                          const pid =
                            e.target.value === "all"
                              ? "all"
                              : e.target.value;
                          setSelectedPlaceId(pid);
                          if (currentUser) {
                            api.userPrefs.setPlace(currentUser.id, pid);
                          }
                        }}
                      >
                        <option value="all">
                          {t("all_locations") || "Oman (All)"}
                        </option>
                        {places.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setIsRightOpen(false)}
                      className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg text-neutral-300"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                  </div>

                  {!currentUser ? (
                    <AuthPanel
                      authStep={authStep}
                      email={email}
                      password={password}
                      fullName={fullName}
                      otp={otp}
                      newPassword={newPassword}
                      isLoading={isLoading}
                      debugOtp={debugOtp}
                      error={error}
                      onClose={() => setIsRightOpen(false)}
                      setAuthStep={setAuthStep}
                      setEmail={setEmail}
                      setPassword={setPassword}
                      setFullName={setFullName}
                      setOtp={setOtp}
                      setNewPassword={setNewPassword}
                      onCheckEmail={handleCheckEmail}
                      onLogin={handleLogin}
                      onRegister={handleRegister}
                      onForgotPassword={handleForgotPassword}
                      onVerifyOtp={handleVerifyOtp}
                      onResetPassword={handleResetPassword}
                    />
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
                          onClick={() => setActiveTab("profile")}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                            activeTab === "profile"
                              ? "bg-black text-white"
                              : "text-neutral-400 hover:bg-neutral-50",
                          )}
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          {t("App.tab_identity")}
                        </button>
                        <button
                          onClick={() => setActiveTab("notifications")}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative",
                            activeTab === "notifications"
                              ? "bg-black text-white"
                              : "text-neutral-400 hover:bg-neutral-50",
                          )}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {t("App.tab_activity")}
                          {notifications.some((n) => !n.is_read) && (
                            <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab("messages")}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative",
                            activeTab === "messages"
                              ? "bg-black text-white"
                              : "text-neutral-400 hover:bg-neutral-50",
                          )}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {t("App.tab_messages")}
                          {conversations.reduce(
                            (acc, c) => acc + (c.unread_count || 0),
                            0,
                          ) > 0 && (
                              <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                            )}
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto px-6 py-10">
                        {activeTab === "messages" ? (
                          <div className="space-y-6 h-full flex flex-col">
                            {!activeChatUser ? (
                              <>
                                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">
                                  {t("App.direct_syncs")}
                                </h3>
                                {(conversations?.length || 0) === 0 ? (
                                  <div className="text-center py-20 text-neutral-300 italic text-xs font-mono">
                                    NO_SYNCS_AVAILABLE
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {conversations?.map((conv) => (
                                      <button
                                        key={conv.id}
                                        onClick={() =>
                                          setActiveChatUser({
                                            id: conv.id,
                                            full_name: conv.full_name,
                                            avatar_url: conv.avatar_url,
                                          })
                                        }
                                        className="w-full bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-3 text-left hover:border-neutral-300 transition-all"
                                      >
                                        <Avatar
                                          src={conv.avatar_url}
                                          name={conv.full_name}
                                          size="sm"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-center mb-1">
                                            <p className="text-xs font-bold truncate">
                                              {conv.full_name}
                                            </p>
                                            {conv.last_message_time && (
                                              <span className="text-[8px] text-neutral-400">
                                                {conv.last_message_time &&
                                                  isValid(
                                                    new Date(
                                                      conv.last_message_time,
                                                    ),
                                                  )
                                                  ? `${formatDistanceToNow(new Date(conv.last_message_time))} ago`
                                                  : ""}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-neutral-500 truncate">
                                            {conv.last_message ||
                                              "Start a conversation"}
                                          </p>
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
                                  <button
                                    onClick={() => setActiveChatUser(null)}
                                    className="text-neutral-400 hover:text-black"
                                  >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                  </button>
                                  <Avatar
                                    src={activeChatUser.avatar_url}
                                    name={activeChatUser.full_name}
                                    size="sm"
                                  />
                                  <p className="text-xs font-bold">
                                    {activeChatUser.full_name}
                                  </p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/30">
                                  {(chatMessages?.length || 0) === 0 ? (
                                    <div className="text-center py-10 text-neutral-400 italic text-xs font-mono">
                                      {t("App.no_messages")}
                                    </div>
                                  ) : (
                                    chatMessages?.map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={cn(
                                          "flex",
                                          msg.sender_id === currentUser?.id
                                            ? "justify-end"
                                            : "justify-start",
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "max-w-[75%] rounded-2xl p-3 text-xs",
                                            msg.sender_id === currentUser?.id
                                              ? "bg-black text-white rounded-br-sm"
                                              : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm",
                                          )}
                                        >
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
                                    onChange={(e) =>
                                      setNewChatMessage(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && sendChatMessage()
                                    }
                                    placeholder="Type a message..."
                                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                                  />
                                  <Button
                                    onClick={sendChatMessage}
                                    className="rounded-full px-4 text-xs font-bold h-9"
                                  >
                                    Send
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : activeTab === "notifications" ? (
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">
                              Pulse Notifications
                            </h3>
                            {(notifications?.length || 0) === 0 ? (
                              <div className="text-center py-20 text-neutral-300 italic text-xs font-mono">
                                NO_ACTIVITY_DETECTED
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {notifications?.map((n) => (
                                  <Card
                                    key={n.id}
                                    className={cn(
                                      "p-4 transition-all",
                                      !n.is_read
                                        ? "bg-white border-black/10 shadow-sm"
                                        : "bg-neutral-50/50 opacity-70",
                                    )}
                                  >
                                    <div className="flex gap-3">
                                      <div
                                        className={cn(
                                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                          n.type === "comment"
                                            ? "bg-blue-50 text-blue-500"
                                            : n.type === "connection"
                                              ? "bg-purple-50 text-purple-500"
                                              : n.type.startsWith("job_")
                                                ? "bg-orange-50 text-orange-500"
                                                : "bg-green-50 text-green-500",
                                        )}
                                      >
                                        {n.type === "comment" ? (
                                          <MessageSquare className="w-4 h-4" />
                                        ) : n.type === "connection" ? (
                                          <UserPlus className="w-4 h-4" />
                                        ) : n.type.startsWith("job_") ? (
                                          <Briefcase className="w-4 h-4" />
                                        ) : (
                                          <Award className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                          <p className="text-xs font-bold truncate">
                                            {n.title}
                                          </p>
                                          <span className="text-[8px] text-neutral-400 whitespace-nowrap">
                                            {n.created_at &&
                                              isValid(new Date(n.created_at))
                                              ? `${formatDistanceToNow(new Date(n.created_at))} ago`
                                              : ""}
                                          </span>
                                        </div>
                                        <p className="text-xs text-neutral-600 mb-3">
                                          {n.content}
                                        </p>
                                        {!n.is_read && (
                                          <button
                                            onClick={() => markAsRead(n.id)}
                                            className="text-[10px] font-bold text-black hover:opacity-70 flex items-center gap-1"
                                          >
                                            Mark as Read{" "}
                                            <ChevronRight className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : isProfileLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-300">
                            <div className="w-6 h-6 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
                            <p className="text-[10px] font-mono uppercase tracking-widest">Syncing identity...</p>
                          </div>
                        ) : !profileData ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-300">No profile data</p>
                            {selectedUserId && (
                              <button
                                onClick={() => fetchProfile(selectedUserId)}
                                className="text-[10px] font-black uppercase tracking-widest text-black hover:opacity-60 transition-opacity"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {isEditingProfile ? (
                              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <header className="flex flex-col items-center text-center mb-8">
                                  <Avatar
                                    src={profileData.avatar_url}
                                    name={profileData.full_name}
                                    size="lg"
                                  />
                                  <h2 className="text-xl font-bold mt-4">
                                    Edit Profile
                                  </h2>
                                </header>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">
                                      Identity Headline
                                    </label>
                                    <input
                                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                                      value={profileForm.headline}
                                      onChange={(e) =>
                                        setProfileForm({
                                          ...profileForm,
                                          headline: e.target.value,
                                        })
                                      }
                                      placeholder="e.g. Senior Product Designer"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">
                                      Bio
                                    </label>
                                    <MarkdownEditor.Root
                                      content={profileForm.bio}
                                      onChange={(v) =>
                                        setProfileForm({ ...profileForm, bio: v })
                                      }
                                    >
                                      <MarkdownEditor.ModeToggle className="mb-2" />
                                      <MarkdownEditor.Auto
                                        placeholder="Describe your capabilities..."
                                        minHeightClass="min-h-[120px]"
                                        textAreaClassName="text-xs"
                                      />
                                    </MarkdownEditor.Root>
                                    {/* AI bio rewrite */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <Sparkles className="w-3 h-3 text-purple-400" />
                                      <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">AI Rewrite</span>
                                    </div>
                                    <textarea
                                      rows={2}
                                      placeholder="e.g. Make it more concise and highlight my AI expertise..."
                                      className="w-full bg-neutral-50 border border-purple-100 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-purple-300 placeholder:text-neutral-300 text-purple-900 resize-none"
                                      value={bioAiInstruction}
                                      onChange={(e) => setBioAiInstruction(e.target.value)}
                                    />
                                    <button
                                      onClick={async () => {
                                        if (!bioAiInstruction) return;
                                        setIsBioAiLoading(true);
                                        try {
                                          await handleAiBio(bioAiInstruction);
                                          setBioAiInstruction("");
                                        } finally {
                                          setIsBioAiLoading(false);
                                        }
                                      }}
                                      disabled={isBioAiLoading || !bioAiInstruction}
                                      className="w-full flex items-center justify-center gap-1.5 bg-purple-500 text-white py-2 rounded-xl text-[10px] font-bold hover:bg-purple-600 transition-colors disabled:opacity-30"
                                    >
                                      {isBioAiLoading ? (
                                        <Sparkles className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <ArrowRight className="w-3 h-3" />
                                      )}
                                      {isBioAiLoading ? "Rewriting..." : "Apply AI Rewrite"}
                                    </button>
                                  </div>
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      className="flex-1 h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest"
                                      onClick={updateProfile}
                                    >
                                      Lock Changes
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest"
                                      onClick={() =>
                                        setIsEditingProfile(false)
                                      }
                                    >
                                      Abort
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <ProfilePanel
                                profileData={profileData}
                                currentUser={currentUser}
                                isConnected={isConnected}
                                onEdit={() => {
                                  if (profileData) {
                                    setProfileForm({
                                      headline: profileData.headline || "",
                                      bio: profileData.bio || "",
                                      avatar_url:
                                        profileData.avatar_url || "",
                                      company_name:
                                        profileData.company_name || "",
                                      company_description:
                                        profileData.company_description || "",
                                      company_website:
                                        profileData.company_website || "",
                                    });
                                    setIsEditingProfile(true);
                                  }
                                }}
                                onLogout={logout}
                                onNavigateToAdmin={() => {
                                  navigate("/admin");
                                  setIsRightOpen(false);
                                }}
                                onSelectUserId={(id) => setSelectedUserId(id)}
                                onRequestSync={(id) =>
                                  handleToggleConnection(id)
                                }
                                onMessage={(user) => {
                                  setActiveTab("messages");
                                  setActiveChatUser(user);
                                }}
                                onAddCVItem={addCVItem}
                                onAddSkill={addSkill}
                                onAddPortfolioItem={addPortfolioItem}
                                onVerifySkill={verifySkill}
                                onAiEditBio={handleAiBio}
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
                    onClick={() => {
                      setIsLeftOpen(false);
                      setIsRightOpen(false);
                    }}
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
                      setAttachmentType("portfolio_item");
                      setAttachmentId(file.id);
                      setShowFileGallery(false);
                    }}
                  />
                )}
              </AnimatePresence>
            </>
          }
        />
        <Route
          path="/admin"
          element={
            currentUser?.role === "admin" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="p-4 border-b border-neutral-100 flex items-center gap-4 bg-white shrink-0">
                  <Button
                    onClick={() => navigate("/")}
                    variant="ghost"
                    className="text-xs font-bold"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Platform
                  </Button>
                  <div className="h-4 w-px bg-neutral-200" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    System Administration
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <AdminPanel currentUser={currentUser} />
                </div>
              </div>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

