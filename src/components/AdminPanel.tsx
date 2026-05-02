import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CreditCard, Database, RotateCcw, BarChart3, TrendingUp, ShieldCheck } from 'lucide-react';
import { fetchAPI, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface AdminPanelProps {
  currentUser: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'system'>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const data = await fetchAPI('/api/admin/analytics', {
        headers: { 'x-user-id': currentUser.id.toString() }
      });
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await fetchAPI('/api/admin/users', {
        headers: { 'x-user-id': currentUser.id.toString() }
      });
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReseed = async () => {
    if (!confirm('Are you sure you want to RE-SEED the entire database? All current data (except this admin) might be lost if not in seed list.')) return;
    setIsLoading(true);
    try {
      await fetchAPI('/api/admin/seed', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id.toString() }
      });
      alert('Seeding complete. Please refresh to see changes.');
      window.location.reload();
    } catch (e) {
      alert('Seeding failed');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubscription = async (userId: number, sub: string) => {
    try {
      await fetchAPI('/api/admin/update-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id.toString() 
        },
        body: JSON.stringify({ userId, subscription: sub })
      });
      fetchUsers();
      fetchAnalytics();
    } catch (e) {
      alert('Update failed');
    }
  };

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
               {analytics.subs.map((s: any) => (
                 <div key={s.subscription}>
                   <p className="text-xl font-black capitalize">{s.subscription}</p>
                   <p className="text-xs font-bold text-neutral-400 uppercase">{s.count} Users</p>
                 </div>
               ))}
             </div>
             <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-center gap-8">
               {analytics.roles.map((r: any) => (
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
              disabled={isLoading}
              className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
            >
              <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              {isLoading ? 'Resetting...' : 'Factory Reset & Seed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
