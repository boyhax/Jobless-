import React, { useState } from 'react';
import { 
  User as UserIcon, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight, 
  MapPin, 
  Globe, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  ExternalLink,
  Plus,
  MessageSquare,
  TrendingUp,
  AtSign,
  Trash2,
} from 'lucide-react';
import { User, CVSection, Skill, PortfolioItem } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

interface ProfilePanelProps {
  profileData: any;
  currentUser: User | null;
  onEdit: () => void;
  onLogout: () => void;
  onNavigateToAdmin: () => void;
  onSelectUserId: (id: number) => void;
  onRequestSync?: (id: number) => void;
  onMessage?: (user: { id: number; full_name: string; avatar_url: string | null }) => void;
  onAddCVItem?: (item: any) => Promise<void>;
  onAddSkill?: (skill: any) => Promise<void>;
  onAddPortfolioItem?: (item: any) => Promise<void>;
  onVerifySkill?: (name: string, url: string) => Promise<void>;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({
  profileData,
  currentUser,
  onEdit,
  onLogout,
  onNavigateToAdmin,
  onSelectUserId,
  onRequestSync,
  onMessage,
  onAddCVItem,
  onAddSkill,
  onAddPortfolioItem,
  onVerifySkill,
}) => {
  const [showCVForm, setShowCVForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [verifyingSkillName, setVerifyingSkillName] = useState<string | null>(null);
  const [verificationUrlInput, setVerificationUrlInput] = useState('');

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

  if (!profileData) {
    return (
      <div className="text-center py-20 text-neutral-300 italic text-[10px] font-mono whitespace-pre-wrap">
        SYNCING_IDENTITY_STREAM...
        {"\n"}
        ESTABLISHING_NEURAL_LINK...
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileData.id;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col items-center text-center px-4">
        <div className="relative">
          <Avatar src={profileData.avatar_url} name={profileData.full_name} size="lg" />
          {profileData.role === 'admin' && (
            <div className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full shadow-lg">
              <ShieldAlert className="w-3 h-3" />
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{profileData.full_name}</h2>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">{profileData.headline || 'Synapse Participant'}</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {profileData.place_name && (
              <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-bold uppercase">
                <MapPin className="w-2.5 h-2.5" />
                {profileData.place_name}
              </div>
            )}
            {profileData.company_website && (
              <a href={profileData.company_website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-blue-500 font-bold uppercase hover:underline">
                <Globe className="w-2.5 h-2.5" />
                Web
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-8 w-full">
          {isOwnProfile ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-2xl h-12 text-[10px] uppercase font-black tracking-widest border-2 border-neutral-100 hover:border-black active:scale-[0.98] transition-all"
                  onClick={onEdit}
                >
                  Modify Node
                </Button>
                <Button 
                  variant="ghost" 
                  className="rounded-2xl h-12 px-6 text-[10px] uppercase font-black tracking-widest text-red-500 hover:bg-neutral-50 active:scale-[0.98] transition-all" 
                  onClick={onLogout}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              {currentUser?.role === 'admin' && (
                <button 
                  onClick={onNavigateToAdmin}
                  className="w-full flex items-center justify-between p-4 bg-red-600 text-white rounded-3xl group shadow-xl shadow-red-600/20 active:scale-[0.98] transition-all mt-2 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <ShieldAlert className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">System Control</p>
                      <p className="text-xs font-bold">Terminal Access</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                className="flex-1 rounded-2xl h-12 text-[10px] uppercase font-black tracking-widest active:scale-[0.98] transition-all"
                onClick={() => onRequestSync?.(profileData.id)}
              >
                Request Synergy
              </Button>
              <Button 
                variant="outline" 
                className="rounded-2xl h-12 px-5 border-2 border-neutral-100 hover:border-black active:scale-[0.98] transition-all"
                onClick={() => onMessage?.({ id: profileData.id, full_name: profileData.full_name, avatar_url: profileData.avatar_url })}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost"
                className="rounded-2xl h-12 px-5 hover:bg-neutral-100 active:scale-[0.98] transition-all"
                onClick={() => onSelectUserId(currentUser?.id || 0)}
              >
                <UserIcon className="w-4 h-4 opacity-40 hover:opacity-100" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {profileData.bio && (
        <section className="bg-neutral-50 p-6 rounded-[32px] border border-neutral-100 italic text-xs leading-relaxed text-neutral-600 mx-4">
          "{profileData.bio}"
        </section>
      )}

      {profileData.analytics && (
        <section className="grid grid-cols-3 gap-2 px-4">
          <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm text-center">
            <p className="text-[7px] font-black text-neutral-400 uppercase tracking-widest mb-1">Views</p>
            <p className="text-lg font-mono font-bold text-black leading-none">{profileData.analytics.profile_views}</p>
            <TrendingUp className="w-3 h-3 text-green-500 mx-auto mt-2" />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm text-center">
            <p className="text-[7px] font-black text-neutral-400 uppercase tracking-widest mb-1">Synths</p>
            <p className="text-lg font-mono font-bold text-black leading-none">{profileData.analytics.connections_received}</p>
            <AtSign className="w-3 h-3 text-black mx-auto mt-2" />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm text-center">
            <p className="text-[7px] font-black text-neutral-400 uppercase tracking-widest mb-1">Engage</p>
            <p className="text-lg font-mono font-bold text-black leading-none">{profileData.analytics.engagement || 0}</p>
            <MessageSquare className="w-3 h-3 text-neutral-300 mx-auto mt-2" />
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
            {profileData.is_company_rep === 1 ? 'Company Chronicles' : 'Career Trajectory'}
          </h3>
          {isOwnProfile && (
            <button 
              onClick={() => setShowCVForm(!showCVForm)}
              className={cn("p-1.5 rounded-lg transition-all", showCVForm ? "bg-black text-white" : "bg-neutral-50 text-neutral-400 hover:text-black")}
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
              <div className="space-y-3 p-5 bg-neutral-50 rounded-[32px] border border-neutral-200 shadow-inner">
                <select 
                  value={cvForm.type}
                  onChange={e => setCvForm({...cvForm, type: e.target.value})}
                  className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                >
                  <option value="experience">Professional Experience</option>
                  <option value="education">Education</option>
                  <option value="project">Key Project</option>
                  <option value="certification">Certification</option>
                </select>
                <input 
                  type="text" placeholder="Title / Role" 
                  value={cvForm.title} onChange={e => setCvForm({...cvForm, title: e.target.value})}
                  className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                />
                <input 
                  type="text" placeholder="Institution / Company" 
                  value={cvForm.subtitle} onChange={e => setCvForm({...cvForm, subtitle: e.target.value})}
                  className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={cvForm.start_date} onChange={e => setCvForm({...cvForm, start_date: e.target.value})} className="bg-white border rounded-2xl px-4 py-3 text-[10px] font-bold" />
                  <input type="date" value={cvForm.end_date} onChange={e => setCvForm({...cvForm, end_date: e.target.value})} className="bg-white border rounded-2xl px-4 py-3 text-[10px] font-bold" />
                </div>
                <textarea 
                  placeholder="Key Responsibilities or Achievements..." 
                  value={cvForm.description} onChange={e => setCvForm({...cvForm, description: e.target.value})}
                  className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs min-h-[100px] focus:ring-2 focus:ring-black outline-none"
                />
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 rounded-2xl h-10 text-[10px] font-black uppercase tracking-widest" 
                    onClick={async () => {
                      if (onAddCVItem) {
                        await onAddCVItem(cvForm);
                        setShowCVForm(false);
                        setCvForm({ type: 'experience', title: '', subtitle: '', description: '', start_date: '', end_date: '', verification_url: '', keywords: '' });
                      }
                    }}
                  >
                    Deploy Node
                  </Button>
                  <Button variant="ghost" className="rounded-2xl h-10 px-4 text-[10px] font-bold text-neutral-400" onClick={() => setShowCVForm(false)}>Abort</Button>
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
                <p className="text-xs font-black text-neutral-900 truncate pr-4">{item.title}</p>
                <span className="text-[9px] font-mono text-neutral-400 whitespace-nowrap">{item.start_date?.split('-')[0]}</span>
              </div>
              <p className="text-[10px] font-bold text-blue-600 mb-2 uppercase tracking-wide">{item.subtitle}</p>
              {item.description && <p className="text-[10px] text-neutral-500 leading-relaxed mb-3">{item.description}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Skill Matrix</h3>
          {isOwnProfile && (
            <button onClick={() => setShowSkillForm(!showSkillForm)} className="text-neutral-400 hover:text-black"><Plus className="w-4 h-4" /></button>
          )}
        </div>

        {showSkillForm && (
          <div className="mb-8 p-5 bg-neutral-50 rounded-[32px] border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 shadow-inner">
            <input 
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none"
              placeholder="Skill Name (e.g. React)..."
              value={skillForm.name}
              onChange={e => setSkillForm({...skillForm, name: e.target.value})}
            />
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Proficiency</span>
              <input 
                type="range" min="1" max="5" 
                value={skillForm.proficiency}
                onChange={e => setSkillForm({...skillForm, proficiency: parseInt(e.target.value)})}
                className="w-24 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest" onClick={async () => {
                if (onAddSkill) {
                  await onAddSkill(skillForm);
                  setShowSkillForm(false);
                  setSkillForm({ name: '', proficiency: 3, verification_url: '' });
                }
              }}>Secure Node</Button>
              <Button variant="ghost" className="h-10 rounded-2xl px-4 text-[10px] font-bold text-neutral-400" onClick={() => setShowSkillForm(false)}>Discard</Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {profileData.skills?.map((skill: Skill) => (
            <div key={skill.name} className="flex flex-col gap-1">
              <div className={cn(
                "group relative flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all",
                skill.is_verified ? "bg-black text-white shadow-lg shadow-black/10" : "bg-neutral-50 border border-neutral-100 text-neutral-700 hover:border-black"
              )}>
                <span>{skill.name}</span>
                <span className="opacity-40">{skill.proficiency}/5</span>
                {skill.is_verified ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : isOwnProfile ? (
                  <button 
                    onClick={() => { setVerifyingSkillName(skill.name); setVerificationUrlInput(''); }}
                    className="bg-black/5 hover:bg-black/10 px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ml-1"
                  >
                    VERIFY
                  </button>
                ) : null}
              </div>

              {verifyingSkillName === skill.name && (
                <div className="mt-2 p-4 bg-white border border-neutral-200 rounded-2xl shadow-xl z-10 animate-in fade-in zoom-in-95">
                  <p className="text-[8px] font-black text-neutral-400 uppercase mb-2 tracking-widest">Prove Expertise</p>
                  <input 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[10px] mb-3 outline-none focus:ring-1 focus:ring-black"
                    placeholder="Credential URL..."
                    value={verificationUrlInput}
                    onChange={(e) => setVerificationUrlInput(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (onVerifySkill) {
                          await onVerifySkill(skill.name, verificationUrlInput);
                          setVerifyingSkillName(null);
                        }
                      }}
                      className="flex-1 bg-black text-white rounded-xl py-2 text-[10px] font-black uppercase"
                    >
                      Sync Proof
                    </button>
                    <button onClick={() => setVerifyingSkillName(null)} className="px-3 py-2 text-[10px] text-neutral-400 font-bold">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Project Nodes</h3>
          {isOwnProfile && (
            <button onClick={() => setShowPortfolioForm(!showPortfolioForm)} className="text-neutral-400 hover:text-black transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {showPortfolioForm && (
          <div className="mb-8 p-5 bg-neutral-50 rounded-[32px] border border-neutral-200 space-y-4 shadow-inner">
            <input 
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold"
              placeholder="Project Instance Name..."
              value={portfolioForm.title}
              onChange={e => setPortfolioForm({...portfolioForm, title: e.target.value})}
            />
            <textarea 
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs min-h-[100px]"
              placeholder="Architectural Details / Outcome..."
              value={portfolioForm.description}
              onChange={e => setPortfolioForm({...portfolioForm, description: e.target.value})}
            />
            <input 
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-mono"
              placeholder="https://output.com/artifact"
              value={portfolioForm.url}
              onChange={e => setPortfolioForm({...portfolioForm, url: e.target.value})}
            />
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 h-10 rounded-2xl text-[10px] font-black uppercase" onClick={async () => {
                if (onAddPortfolioItem) {
                  await onAddPortfolioItem(portfolioForm);
                  setShowPortfolioForm(false);
                  setPortfolioForm({ title: '', url: '', description: '', thumbnail_url: '' });
                }
              }}>Add Portfolio</Button>
              <Button variant="ghost" className="h-10 rounded-2xl px-4 text-[10px] font-bold text-neutral-400" onClick={() => setShowPortfolioForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {profileData.portfolio?.map((item: PortfolioItem) => (
            <Card key={item.id} className="p-6 bg-white border-neutral-100 hover:border-black transition-all group cursor-pointer rounded-[32px]">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-black text-neutral-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.title}</h4>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-300 group-hover:text-black transition-all" />
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2 md:line-clamp-none mb-4">{item.description}</p>
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline flex items-center gap-1">
                  Access Artifact <ChevronRight className="w-2.5 h-2.5" />
                </a>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
