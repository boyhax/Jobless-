import React, { useMemo, useState, useEffect } from 'react';
import { LayoutDashboard, Users, CreditCard, Database, RotateCcw, BarChart3, TrendingUp, ShieldCheck, RefreshCw, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';
import * as api from '../services/api';
import { motion } from 'motion/react';
import { defineAbilityFor } from '../lib/ability';

interface AdminPanelProps {
  currentUser: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'data' | 'system'>('analytics');
=======
  const ability = useMemo(() => defineAbilityFor(currentUser), [currentUser]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'system'>('analytics');
>>>>>>> nitro
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [seedCount, setSeedCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ability.can('view', 'AdminPanel')) return;
    fetchAnalytics();
    fetchUsers();
<<<<<<< HEAD
    if (activeTab === 'data') {
      fetchAdminContent();
    }
  }, [activeTab]);

  const fetchAdminContent = async () => {
    try {
      setIsLoading(true);
      const [ps, js, ts] = await Promise.all([
        fetchAPI('/api/admin/content/posts', { headers: { 'x-user-id': currentUser.id.toString() } }),
        fetchAPI('/api/admin/content/jobs', { headers: { 'x-user-id': currentUser.id.toString() } }),
        fetchAPI('/api/admin/content/topics', { headers: { 'x-user-id': currentUser.id.toString() } })
      ]);
      setPosts(ps);
      setJobs(js);
      setTopics(ts);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSeed = async () => {
    setIsLoading(true);
    try {
      await fetchAPI('/api/admin/seed/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id.toString() 
        },
        body: JSON.stringify({ count: seedCount })
      });
      alert('Seed generation success');
      fetchAdminContent();
      fetchAnalytics();
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSeed = async () => {
    if (!confirm('Delete all records marked as [is_seed: true]?')) return;
    setIsLoading(true);
    try {
      await fetchAPI('/api/admin/seed/clear', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id.toString() }
      });
      alert('Seed content cleared');
      fetchAdminContent();
      fetchAnalytics();
    } catch (e: any) {
      alert(`Clear failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };
=======
  }, [ability]);
>>>>>>> nitro

  const fetchAnalytics = async () => {
    if (!ability.can('read', 'Analytics')) return;
    try {
      const data = await api.system.analytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    if (!ability.can('read', 'User')) return;
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReseed = async () => {
    if (!ability.can('seed', 'System')) return;
    if (!confirm('Are you sure you want to RE-SEED the entire database? All current data (except this admin) might be lost if not in seed list.')) return;
    setIsLoading(true);
    try {
      await api.system.seed();
      alert('Seeding complete. Please refresh to see changes.');
      window.location.reload();
    } catch (e) {
      alert('Seeding failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedJobs = async () => {
    if (!ability.can('seed', 'System')) return;
    setIsLoading(true);
    try {
      const res = await api.system.seedJobs();
      alert(`Successfully seeded ${res.count} jobs.`);
    } catch (e: any) {
      alert(`Seeding failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubscription = async (userId: number, sub: string) => {
    if (!ability.can('update', 'User')) return;
    try {
      await api.users.updateSubscription(userId, sub);
      fetchUsers();
      fetchAnalytics();
    } catch (e) {
      alert('Update failed');
    }
  };

  if (!ability.can('view', 'AdminPanel')) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6">
          <h2 className="text-lg font-black tracking-tight">Access Denied</h2>
          <p className="text-sm text-neutral-500 mt-1">You do not have permission to view the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-500" />
            Admin Command Center
          </h1>
          <p className="text-neutral-500 text-sm">Manage users, subscriptions, and platform health.</p>
        </div>
        <div className="flex bg-neutral-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'analytics' ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-black")}
          >
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'users' ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-black")}
          >
            User Management
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'data' ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-black")}
          >
            Data
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'system' ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-black")}
          >
            System
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-blue-500" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-black">{analytics.users.count}</p>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Users</p>
          </div>
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm space-y-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <p className="text-3xl font-black">{analytics.posts.count}</p>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Global Posts</p>
          </div>
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm space-y-2 text-center col-span-1 md:col-span-2 flex flex-col justify-center">
             <div className="flex justify-around">
               {analytics.subs?.map((s: any) => (
                 <div key={s.subscription}>
                   <p className="text-xl font-black capitalize">{s.subscription}</p>
                   <p className="text-xs font-bold text-neutral-400 uppercase">{s.count} Users</p>
                 </div>
               ))}
             </div>
             <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-center gap-8">
               {analytics.roles?.map((r: any) => (
                 <div key={r.role} className="flex items-center gap-2">
                   <div className={cn("w-2 h-2 rounded-full", r.role === 'admin' ? "bg-red-500" : r.role === 'company' ? "bg-blue-500" : "bg-neutral-400")} />
                   <span className="text-[10px] font-bold uppercase text-neutral-500">{r.role}: {r.count}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Subscription</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{u.full_name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter",
                      u.role === 'admin' ? "bg-red-100 text-red-600" : u.role === 'company' ? "bg-blue-100 text-blue-600" : "bg-neutral-100 text-neutral-600"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.subscription}
                      onChange={(e) => updateSubscription(u.id, e.target.value)}
                      className="text-[10px] bg-transparent border-none focus:ring-0 font-bold uppercase"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[10px] font-bold text-red-500 hover:underline">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black">Seed Generator</h3>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={seedCount}
                  onChange={(e) => setSeedCount(parseInt(e.target.value))}
                  className="w-24 bg-neutral-100 border-none rounded-lg p-2 text-sm font-bold"
                  min="1"
                  max="50"
                  placeholder="Count"
                />
                <button 
                  onClick={handleGenerateSeed}
                  disabled={isLoading}
                  className="flex-1 bg-indigo-500 text-white rounded-lg p-2 text-xs font-bold hover:bg-indigo-600 transition-all disabled:opacity-50"
                >
                  Generate Content
                </button>
              </div>
              <button 
                onClick={handleClearSeed}
                disabled={isLoading}
                className="w-full bg-red-100 text-red-600 rounded-lg p-2 text-xs font-bold hover:bg-red-200 transition-all"
              >
                Clear Seed Data
              </button>
            </div>
            <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
              <div className="text-center space-y-2">
                <RotateCcw className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-bold">Content Overview</p>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <p className="text-xl font-black">{posts.length}</p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black">{jobs.length}</p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black">{topics.length}</p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Topics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
             {/* Posts List */}
             <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
               <div className="p-4 bg-neutral-50 border-b border-neutral-100 font-bold text-xs uppercase tracking-widest text-neutral-500 flex justify-between items-center">
                 <span>All Posts</span>
                 <span className="text-[10px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">{posts.length}</span>
               </div>
               <div className="overflow-y-auto divide-y divide-neutral-50">
                 {posts.map(p => (
                   <div key={p.id} className="p-4 space-y-1">
                     <div className="flex justify-between items-start">
                       <span className="text-[10px] font-bold text-blue-500">{p.user?.full_name || 'System'}</span>
                       {p.is_seed && <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">Seed</span>}
                     </div>
                     <p className="text-xs text-neutral-600 line-clamp-2">{p.content}</p>
                     <p className="text-[9px] text-neutral-400">{new Date(p.created_at).toLocaleString()}</p>
                   </div>
                 ))}
               </div>
             </div>

             {/* Jobs List */}
             <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
               <div className="p-4 bg-neutral-50 border-b border-neutral-100 font-bold text-xs uppercase tracking-widest text-neutral-500 flex justify-between items-center">
                 <span>All Jobs</span>
                 <span className="text-[10px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">{jobs.length}</span>
               </div>
               <div className="overflow-y-auto divide-y divide-neutral-50">
                 {jobs.map(j => (
                   <div key={j.id} className="p-4 space-y-1">
                     <div className="flex justify-between items-start">
                       <span className="text-[10px] font-bold text-neutral-800">{j.title} @ {j.company_name}</span>
                       {j.is_seed && <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">Seed</span>}
                     </div>
                     <p className="text-[9px] text-neutral-400 font-mono italic">{j.id}</p>
                     <p className="text-[9px] text-neutral-400">{new Date(j.created_at).toLocaleString()}</p>
                   </div>
                 ))}
               </div>
             </div>

             {/* Topics List */}
             <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
               <div className="p-4 bg-neutral-50 border-b border-neutral-100 font-bold text-xs uppercase tracking-widest text-neutral-500 flex justify-between items-center">
                 <span>All Topics</span>
                 <span className="text-[10px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">{topics.length}</span>
               </div>
               <div className="overflow-y-auto p-4 flex flex-wrap gap-2">
                 {topics.map(t => (
                   <span key={t.id} className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded-lg border border-neutral-200">
                     #{t.name}
                   </span>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200 p-8 rounded-3xl space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-black">Data Management</h3>
              <p className="text-sm text-neutral-500">Refresh the entire environment with fresh seed data for Oman market testing.</p>
            </div>
            <button 
              onClick={handleReseed}
              disabled={isLoading || !ability.can('seed', 'System')}
              className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
            >
              <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              {isLoading ? 'Resetting...' : 'Factory Reset & Seed'}
            </button>
            <button 
              onClick={handleSeedJobs}
              disabled={isLoading || !ability.can('seed', 'System')}
              className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50"
            >
              <Briefcase className={cn("w-4 h-4", isLoading && "animate-spin")} />
              {isLoading ? 'Seeding...' : 'Seed Sample Jobs'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
