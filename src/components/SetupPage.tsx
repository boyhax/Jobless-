import React, { useState } from 'react';
import { Shield, Database, ArrowRight, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import * as api from '../services/api';
import { motion } from 'motion/react';

interface SetupPageProps {
  onComplete: () => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    seed: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.setup.init(formData);
      setSuccess(true);
      setTimeout(() => onComplete(), 2000);
    } catch (err: any) {
      setError(err.message || 'Initialization failed');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-4"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">System Initialized</h1>
          <p className="text-neutral-500">The master administrator has been created and data is syncing. Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-3xl shadow-xl shadow-neutral-200/50 border border-neutral-100 overflow-hidden flex flex-col md:flex-row"
      >
        <div className="md:w-5/12 bg-neutral-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center blur-sm absolute" />
              <Shield className="w-8 h-8 text-white relative" />
              <span className="font-bold tracking-tighter text-xl">PROSYNC</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight mb-4">Core System Initialization</h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Create the primary administrative identity to begin orchestrating your professional network.
            </p>
          </div>
          
          <div className="relative z-10 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Secure Protocol v4.0</span>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="md:w-7/12 p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 mb-1">Master Admin Setup</h3>
              <p className="text-xs text-neutral-400">Configure your root credentials.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    placeholder="System Administrator"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    placeholder="admin@prosync.io"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Root Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl cursor-pointer hover:bg-neutral-100 transition-colors group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.seed}
                      onChange={(e) => setFormData({ ...formData, seed: e.target.checked })}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-neutral-200 bg-white transition-all checked:bg-neutral-900 checked:border-neutral-900"
                    />
                    <Database className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-1 transition-opacity pointer-events-none" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-neutral-900">Seed Ecosystem Data</p>
                    <p className="text-[10px] text-neutral-400">Populate the system with initial nodes, topics, and connections.</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-neutral-900 text-white font-bold py-4 rounded-2xl text-sm hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg shadow-neutral-900/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Initialize System
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
