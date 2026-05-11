import { formatDistanceToNow, isValid } from "date-fns";
import {
  Award,
  Bell,
  Briefcase,
  CheckCircle2,
  FileText,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { cn } from "../../lib/utils";
import type { Job, User } from "../../types";
import type { ReactNode } from "react";
import { MarkdownEditor } from "./MarkdownEditor";

type JobsFeatureProps = {
  view: "jobs" | "applicants";
  onViewChange: (view: "jobs" | "applicants") => void;
  selectedJobId: string | number | null;
  isAiLoading: boolean;
  onAiShortlistApplicants: () => void;
  applicantFilter: "all" | "pending" | "shortlisted";
  setApplicantFilter: (value: "all" | "pending" | "shortlisted") => void;
  applicantSearch: string;
  setApplicantSearch: (value: string) => void;
  applicantTypeFilter: "all" | "cv_item" | "portfolio_item" | "none";
  setApplicantTypeFilter: (value: "all" | "cv_item" | "portfolio_item" | "none") => void;
  applicants: any[];
  aiApplicantsFeedback: any[] | null;
  onUpdateApplicantStatus: (appId: number, status: string) => void;
  onInspectApplicant: (userId: string | number) => void;
  jobAlerts: any[];
  showJobAlertForm: boolean;
  setShowJobAlertForm: (value: boolean) => void;
  newJobAlert: { keyword: string; experience_level: string; location: string };
  setNewJobAlert: (value: { keyword: string; experience_level: string; location: string }) => void;
  onCreateJobAlert: () => void;
  onDeleteJobAlert: (id: string | number) => void;
  selectedPlaceId: string | number | "all";
  setSelectedPlaceId: (value: string | number | "all") => void;
  places: any[];
  jobFilters: { q: string; experience: string; minSalary: string };
  setJobFilters: (value: { q: string; experience: string; minSalary: string }) => void;
  currentUser: User | null;
  showJobForm: boolean;
  setShowJobForm: (value: boolean) => void;
  newJob: {
    title: string;
    location: string;
    description: string;
    salary_range: string;
    experience_level: string;
    end_date: string;
  };
  setNewJob: (value: {
    title: string;
    location: string;
    description: string;
    salary_range: string;
    experience_level: string;
    end_date: string;
  }) => void;
  onPostJob: () => void;
  jobs: Job[];
  onFetchApplicants: (jobId: string | number) => void;
  applyingToJobId: string | number | null;
  setApplyingToJobId: (id: string | number | null) => void;
  appAttachmentType: "cv_item" | "portfolio_item" | "none";
  setAppAttachmentType: (value: "cv_item" | "portfolio_item" | "none") => void;
  setAppAttachmentId: (id: string | number | null) => void;
  profileData: any;
  onApplyToJob: () => void;
  renderJobActions?: (job: Job) => ReactNode;
  renderApplicantActions?: (applicant: any) => ReactNode;
};

export function JobsFeature(props: JobsFeatureProps) {
  const {
    view,
    onViewChange,
    selectedJobId,
    isAiLoading,
    onAiShortlistApplicants,
    applicantFilter,
    setApplicantFilter,
    applicantSearch,
    setApplicantSearch,
    applicantTypeFilter,
    setApplicantTypeFilter,
    applicants,
    aiApplicantsFeedback,
    onUpdateApplicantStatus,
    onInspectApplicant,
    jobAlerts,
    showJobAlertForm,
    setShowJobAlertForm,
    newJobAlert,
    setNewJobAlert,
    onCreateJobAlert,
    onDeleteJobAlert,
    selectedPlaceId,
    setSelectedPlaceId,
    places,
    jobFilters,
    setJobFilters,
    currentUser,
    showJobForm,
    setShowJobForm,
    newJob,
    setNewJob,
    onPostJob,
    jobs,
    onFetchApplicants,
    applyingToJobId,
    setApplyingToJobId,
    appAttachmentType,
    setAppAttachmentType,
    setAppAttachmentId,
    profileData,
    onApplyToJob,
    renderJobActions,
    renderApplicantActions,
  } = props;

  const { t } = useTranslation();

  if (view === "applicants") {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Applicant Portal</h2>
            <p className="text-xs text-neutral-500">Managing talent for Job ID: {selectedJobId}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onAiShortlistApplicants} disabled={isAiLoading} variant="outline" className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
              <Sparkles className={cn("w-3 h-3 mr-2", isAiLoading && "animate-spin")} />
              {t("App.ai_search")}
            </Button>
            <Button variant="ghost" onClick={() => onViewChange("jobs")} className="text-xs">
              Back to Jobs
            </Button>
          </div>
        </header>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white border border-neutral-200 rounded-3xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "shortlisted"] as const).map((f) => (
              <button key={f} onClick={() => setApplicantFilter(f)} className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all", applicantFilter === f ? "bg-black text-white shadow-sm" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100")}>{f}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
              <input type="text" placeholder="Search name..." value={applicantSearch} onChange={(e) => setApplicantSearch(e.target.value)} className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-8 pr-3 py-2 text-[10px] focus:ring-1 focus:ring-black outline-none" />
            </div>
            <select value={applicantTypeFilter} onChange={(e) => setApplicantTypeFilter(e.target.value as any)} className="bg-neutral-50 border border-neutral-100 rounded-xl px-2 py-2 text-[10px] font-bold text-neutral-500 uppercase outline-none">
              <option value="all">Any Proof</option>
              <option value="cv_item">CV Only</option>
              <option value="portfolio_item">Portfolio Only</option>
              <option value="none">No Proof</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {applicants.filter((a) => {
            const matchesStatus = applicantFilter === "all" || a.status === applicantFilter;
            const matchesSearch = (a.full_name || "").toLowerCase().includes((applicantSearch || "").toLowerCase());
            const matchesType = applicantTypeFilter === "all" || a.attachment_type === applicantTypeFilter;
            return matchesStatus && matchesSearch && matchesType;
          }).map((applicant) => (
            <Card key={applicant.id} className="p-4 flex items-center gap-4 hover:border-neutral-300 transition-colors group">
              <Avatar src={applicant.avatar_url} name={applicant.full_name} className="ring-2 ring-offset-2 ring-transparent group-hover:ring-black/5 transition-all" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm truncate">{applicant.full_name}</h4>
                </div>
                <p className="text-[10px] text-neutral-500 truncate uppercase font-mono">{applicant.headline}</p>
                {aiApplicantsFeedback?.find((f) => f.applicantId === applicant.user_id) && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in zoom-in-95">
                    <p className="text-[9px] text-blue-800 line-clamp-2 italic">{aiApplicantsFeedback.find((f) => f.applicantId === applicant.user_id)?.reasoning}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {applicant.status === "pending" && (
                  <Button onClick={() => onUpdateApplicantStatus(applicant.id, "shortlisted")} variant="outline" className="h-8 text-[10px] font-bold border-neutral-200 hover:border-black transition-colors px-4">Shortlist</Button>
                )}
                {applicant.status === "shortlisted" && (
                  <span className="bg-black text-white px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Shortlisted</span>
                )}
                <Button variant="ghost" onClick={() => onInspectApplicant(applicant.user_id)} className="h-8 text-[10px] font-bold text-neutral-400 hover:text-black">Inspect Profile</Button>
                {renderApplicantActions?.(applicant)}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <div className="space-y-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <input type="text" placeholder="Keyword" value={newJobAlert.keyword} onChange={(e) => setNewJobAlert({ ...newJobAlert, keyword: e.target.value })} className="w-full bg-white/10 rounded-xl px-3 py-2 text-xs" />
              <input type="text" placeholder="Location" value={newJobAlert.location} onChange={(e) => setNewJobAlert({ ...newJobAlert, location: e.target.value })} className="w-full bg-white/10 rounded-xl px-3 py-2 text-xs" />
              <Button onClick={onCreateJobAlert} className="w-full bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-bold py-5">Enable Pulse Alert</Button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {(jobAlerts?.length || 0) === 0 ? <div className="text-[10px] text-neutral-500 italic py-2">No active alerts.</div> : jobAlerts.map((alert) => (
                <div key={alert.id} className="flex-shrink-0 bg-white/5 border border-white/10 p-3 rounded-2xl min-w-[140px] relative group/alert">
                  <button onClick={() => onDeleteJobAlert(alert.id)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/alert:opacity-100 transition-opacity"><Plus className="w-2 h-2 rotate-45" /></button>
                  <p className="text-[10px] font-bold truncate">{alert.keyword || "All Topics"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {(jobs?.length || 0) === 0 ? (
          <div className="text-center py-20 text-neutral-400">No jobs match your criteria.</div>
        ) : (
          jobs.map((job) => (
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
                    {job.end_date && isValid(new Date(job.end_date)) && <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-100"><Award className="w-3 h-3" /> Closes: {new Date(job.end_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {currentUser?.id === job.user_id && <Button onClick={() => onFetchApplicants(job.id)} variant="outline" className="h-8 text-[10px] font-bold">Applicants</Button>}
                  {currentUser?.is_company_rep === 0 && (applyingToJobId === job.id ? (
                    <div className="bg-neutral-50 border border-neutral-100 p-3 rounded-xl shadow-inner">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Attach Professional Insight</p>
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => setAppAttachmentType(appAttachmentType === "cv_item" ? "none" : "cv_item")} className={cn("p-2 rounded-lg border transition-all", appAttachmentType === "cv_item" ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-200")}><FileText className="w-4 h-4" /></button>
                        <button onClick={() => setAppAttachmentType(appAttachmentType === "portfolio_item" ? "none" : "portfolio_item")} className={cn("p-2 rounded-lg border transition-all", appAttachmentType === "portfolio_item" ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-200")}><Layers className="w-4 h-4" /></button>
                      </div>
                      <Button onClick={onApplyToJob} className="w-full rounded-lg text-[10px] h-8 font-bold">Confirm</Button>
                    </div>
                  ) : (
                    <Button onClick={() => setApplyingToJobId(job.id)} className="rounded-xl text-xs font-bold shrink-0">Apply</Button>
                  ))}
                  {renderJobActions?.(job)}
                </div>
              </div>
              <MarkdownEditor.Root content={job.description}>
                <MarkdownEditor.Viewer className="text-sm text-neutral-700 mt-4 pt-4 border-t border-neutral-100" />
              </MarkdownEditor.Root>
              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                {job.created_at && isValid(new Date(job.created_at)) ? <span>Posted {formatDistanceToNow(new Date(job.created_at))} ago</span> : <span>Recently posted</span>}
                <span>Job ID: {String(job.id).padStart(6, "0")}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
