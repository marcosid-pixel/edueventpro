import React, { useState } from 'react';
import { Mail, GraduationCap, ArrowRight, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { View } from '../types';

const SignupView = ({ setView }: { setView: (v: View) => void }) => {
  const { signup } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não conferem');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signup({
        displayName: formData.displayName,
        email: formData.email,
        password: formData.password
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex bg-surface-container dark:bg-[#030b1a] z-[100] animate-in fade-in duration-700 transition-colors duration-500">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] rounded-full bg-blue-500/10 blur-[160px]" />
      </div>

      <div className="flex-1 relative z-10 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-xl bg-card-bg/80 dark:bg-white/[0.03] backdrop-blur-[40px] border border-outline-variant dark:border-white/[0.08] rounded-[56px] p-16 shadow-2xl space-y-12">
          <header className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6">
              <GraduationCap className="text-white w-10 h-10" />
            </div>
            <h2 className="text-4xl font-headline font-bold text-text-primary tracking-tight">Criar Conta</h2>
            <p className="text-text-secondary text-lg font-medium opacity-60">Junte-se à próxima geração de gestão acadêmica.</p>
          </header>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-500 text-sm font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <form className="space-y-6" onSubmit={handleSignup}>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] ml-2">Nome Completo</label>
              <div className="relative group/field">
                <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within/field:text-secondary transition-colors" size={20} />
                <input 
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full h-16 bg-surface-container/50 dark:bg-white/[0.03] border border-outline-variant dark:border-white/[0.08] rounded-[24px] pl-16 pr-6 text-text-primary placeholder-text-secondary/20 focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-lg outline-none" 
                  placeholder="Dr. Ricardo Almeida" 
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] ml-2">E-mail Institucional</label>
              <div className="relative group/field">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within/field:text-secondary transition-colors" size={20} />
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-16 bg-surface-container/50 dark:bg-white/[0.03] border border-outline-variant dark:border-white/[0.08] rounded-[24px] pl-16 pr-6 text-text-primary placeholder-text-secondary/20 focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-lg outline-none" 
                  placeholder="nome@uninta.edu.br" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] ml-2">Senha</label>
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full h-16 bg-surface-container/50 dark:bg-white/[0.03] border border-outline-variant dark:border-white/[0.08] rounded-[24px] px-6 text-text-primary placeholder-text-secondary/20 focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-lg outline-none" 
                  placeholder="••••••••" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] ml-2">Confirmar</label>
                <input 
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full h-16 bg-surface-container/50 dark:bg-white/[0.03] border border-outline-variant dark:border-white/[0.08] rounded-[24px] px-6 text-text-primary placeholder-text-secondary/20 focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-lg outline-none" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading} 
              className="w-full h-16 bg-text-primary text-card-bg rounded-[24px] font-black shadow-xl transition-all text-xl active:scale-[0.98] mt-6 flex items-center justify-center gap-3 group disabled:opacity-50"
            >
               {loading ? 'CADASTRANDO...' : (
                 <>
                   Começar agora
                   <ArrowRight className="group-hover:translate-x-1 transition-transform" size={24} />
                 </>
               )}
            </button>
          </form>

          <footer className="text-center pt-8 border-t border-outline-variant">
            <p className="text-base font-medium text-text-secondary">
              Já possui uma conta? <button onClick={() => setView('login')} className="text-text-primary font-bold hover:text-secondary transition-colors ml-1">Entrar</button>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SignupView;
