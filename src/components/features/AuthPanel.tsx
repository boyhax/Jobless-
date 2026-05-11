import { ChevronRight, Lock, Mail, Plus, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

type AuthStep = "email" | "password" | "register" | "forgot" | "verify" | "new_pass";

type AuthPanelProps = {
  authStep: AuthStep;
  email: string;
  password: string;
  fullName: string;
  otp: string;
  newPassword: string;
  isLoading: boolean;
  debugOtp: string | null;
  error: string | null;
  onClose: () => void;
  setAuthStep: (step: AuthStep) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setFullName: (value: string) => void;
  setOtp: (value: string) => void;
  setNewPassword: (value: string) => void;
  onCheckEmail: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
  onVerifyOtp: () => void;
  onResetPassword: () => void;
};

export function AuthPanel(props: AuthPanelProps) {
  const {
    authStep,
    email,
    password,
    fullName,
    otp,
    newPassword,
    isLoading,
    debugOtp,
    error,
    onClose,
    setAuthStep,
    setEmail,
    setPassword,
    setFullName,
    setOtp,
    setNewPassword,
    onCheckEmail,
    onLogin,
    onRegister,
    onForgotPassword,
    onVerifyOtp,
    onResetPassword,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-white">
      <div className="flex justify-end items-center mb-6">
        <button onClick={onClose} className="lg:hidden text-neutral-300">
          <Plus className="w-5 h-5 rotate-45" />
        </button>
      </div>
      <div className="flex justify-center mb-8">
        <div className="bg-black p-5 rounded-[28px] shadow-2xl shadow-black/20">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-black text-center mb-1 tracking-tight">ProSync Oman</h1>
      <p className="text-neutral-400 text-center mb-8 text-sm font-medium">{t("verified_network_oman")}</p>
      <div className="space-y-4 max-w-sm mx-auto w-full">
        {authStep === "email" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
              <input
                type="email"
                placeholder="example@work.om"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onCheckEmail()}
                className="w-full pl-11 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all font-bold text-sm"
              />
            </div>
            <Button onClick={onCheckEmail} disabled={isLoading} className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm">
              {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Continue"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
        {authStep === "password" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <button onClick={() => setAuthStep("email")} className="text-xs font-bold text-neutral-400 flex items-center gap-1 hover:text-black">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Email
            </button>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none" />
            </div>
            <button onClick={onForgotPassword} className="text-[10px] font-bold text-neutral-400 hover:text-black">{t("Auth.forgot_password")}</button>
            <Button onClick={onLogin} disabled={isLoading} className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm">{isLoading ? t("Auth.verifying") : t("Auth.login")}</Button>
          </motion.div>
        )}
        {authStep === "register" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <input type="text" placeholder={t("Auth.full_name")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl" />
            <input type="email" placeholder={t("Auth.email") || "Email Address"} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl" />
            <input type="password" placeholder={t("Auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl" />
            <Button onClick={onRegister} disabled={isLoading} className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm">{t("Auth.join_network")}</Button>
          </motion.div>
        )}
        {authStep === "verify" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full px-4 py-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-center font-mono font-black text-2xl tracking-[0.5em]" />
            {debugOtp && <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-700 font-mono text-center">DEBUG OTP: {debugOtp}</div>}
            <Button onClick={onVerifyOtp} disabled={isLoading || (otp?.length || 0) < 6} className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm">{t("Auth.verify_otp")}</Button>
          </motion.div>
        )}
        {authStep === "new_pass" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <input type="password" placeholder={t("Auth.password")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl" />
            <Button onClick={onResetPassword} disabled={isLoading} className="w-full h-14 bg-black text-white rounded-2xl font-black text-sm">{t("Auth.reset_password")}</Button>
          </motion.div>
        )}
        {error && <p className="text-[10px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center">{error}</p>}
      </div>
    </div>
  );
}
