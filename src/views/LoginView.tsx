import React, { useState } from 'react';
import { Mail, Lock, GraduationCap, Moon, Sun, LayoutDashboard, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { View } from '../types';

const LoginView = ({ setView }: { setView: (v: View) => void }) => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(formData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex bg-surface-container dark:bg-[#030b1a] z-[100] animate-in fade-in duration-700 transition-colors duration-500">
      {/* Theme Toggle for Login */}
      <div className="absolute top-8 right-8 z-50">
        <button 
          onClick={toggleTheme}
          className="p-3 bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-text-primary/50 hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all backdrop-blur-md"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {/* Circuit Pattern Background Effect */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: `radial-gradient(circle at 2px 2px, ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'} 1px, transparent 0)`,
             backgroundSize: '40px 40px' 
           }} 
      />
      
      {/* Decorative Glows */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Left Content Area */}
      <div className="hidden lg:flex w-[55%] relative z-10 flex-col justify-center p-24">
        <div className="max-w-xl space-y-12">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <GraduationCap className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-headline font-extrabold text-text-primary tracking-tight">EduEvent Pro</h1>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-5xl font-headline font-bold text-text-primary leading-[1.1] tracking-tight">
              Gerenciamento acadêmico de alta performance.
            </h2>
            <p className="text-xl text-text-secondary font-medium leading-relaxed max-w-lg">
              Simplifique a organização de cursos, calendários e relatórios institucionais com uma interface desenhada para velocidade e precisão.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6">
            <div className="p-8 rounded-[32px] bg-card-bg/40 border border-outline-variant backdrop-blur-md group hover:bg-card-bg/60 transition-all duration-500">
              <LayoutDashboard className="text-secondary mb-6 group-hover:scale-110 transition-transform duration-500" size={32} />
              <p className="text-sm font-bold text-text-primary uppercase tracking-[0.2em] font-headline">Painel Unificado</p>
            </div>
            <div className="p-8 rounded-[32px] bg-card-bg/40 border border-outline-variant backdrop-blur-md group hover:bg-card-bg/60 transition-all duration-500">
              <BarChart2 className="text-secondary mb-6 group-hover:scale-110 transition-transform duration-500" size={32} />
              <p className="text-sm font-bold text-text-primary uppercase tracking-[0.2em] font-headline">Relatórios em Tempo Real</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Area - Card */}
      <div className="flex-1 relative z-10 flex flex-col justify-center items-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-card-bg/80 dark:bg-white/[0.03] backdrop-blur-[40px] border border-outline-variant dark:border-white/[0.08] rounded-[56px] p-16 shadow-[0_48px_96px_-24px_rgba(3,11,26,0.3)] dark:shadow-[0_48px_96px_-24px_rgba(3,11,26,0.6)] space-y-12"
        >
          <header className="text-center space-y-4">
            <h2 className="text-4xl font-headline font-bold text-text-primary tracking-tight">Boas-vindas</h2>
            <p className="text-text-secondary text-lg font-medium opacity-60">Acesse sua conta administrativa para continuar.</p>
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

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] ml-2">E-mail Institucional</label>
              <div className="relative group/field">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within/field:text-secondary transition-colors" size={20} />
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-16 bg-surface-container/50 dark:bg-white/[0.03] border border-outline-variant dark:border-white/[0.08] rounded-[24px] pl-16 pr-6 text-text-primary placeholder-text-secondary/20 focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-lg outline-none" 
                  placeholder="admin@uninta.edu.br" 
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em]">Senha</label>
                <button type="button" className="text-[10px] font-black text-secondary hover:text-secondary-container transition-colors uppercase tracking-widest">Esqueceu a senha?</button>
              </div>
              <div className="relative group/field">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within/field:text-secondary transition-colors" size={20} />
                <input 
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full h-16 bg-surface-container/50 dark:bg-white/[0.03] border border-outline-variant dark:border-white/[0.08] rounded-[24px] pl-16 pr-6 text-text-primary placeholder-text-secondary/20 focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-lg outline-none" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading} 
              className="w-full h-16 bg-secondary-container hover:bg-secondary text-white rounded-[24px] font-bold shadow-[0_24px_48px_-12px_rgba(33,112,228,0.3)] transition-all text-xl active:scale-[0.98] group relative overflow-hidden"
            >
              <span className="relative z-10 uppercase tracking-widest">
                {loading ? 'AUTENTICANDO...' : 'Entrar na conta'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </form>

          <footer className="text-center pt-8 border-t border-outline-variant space-y-10">
            <p className="text-sm font-medium text-text-secondary">
              Novo na plataforma? <button onClick={() => setView('signup')} className="text-text-primary font-bold hover:text-secondary transition-colors ml-1">Criar conta</button>
            </p>
            
            <div className="flex flex-col items-center gap-8 text-text-secondary/40">
              <div className="space-y-1">
                <p className="text-[9px] font-mono tracking-[0.5em] uppercase font-black">Sistemas Acadêmicos Integrados v5.2.0</p>
                <p className="text-[9px] font-mono tracking-[0.5em] uppercase font-black">© 2024 EduEvent Pro. Todos os direitos reservados.</p>
              </div>
            </div>
          </footer>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginView;
