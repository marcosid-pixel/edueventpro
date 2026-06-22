import React, { useState } from 'react';
import { Mail, Lock, GraduationCap, Moon, Sun, ArrowRight, Monitor, Cpu, UserPlus } from 'lucide-react';
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
      setError(err.message === 'Invalid credentials' ? 'Credenciais inválidas' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row bg-arctic-surface dark:bg-[#030b1a] z-[100] transition-colors duration-500 overflow-hidden">

      {/* Botão de tema */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-card-bg/10 border border-outline-variant/20 rounded-full text-text-primary/60 hover:text-text-primary hover:bg-card-bg/20 transition-all backdrop-blur-xl"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      {/* ── PAINEL ESQUERDO ── */}
      <div className="hidden lg:flex w-1/2 bg-[#0a111f] flex-col justify-between border-r border-white/5 overflow-hidden">

        {/* Textos — topo esquerdo */}
        <div className="flex flex-col gap-5 px-12 pt-10 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-core/20 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-core/30 w-fit">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_8px_#818cf8]" />
            <span className="text-[10px] font-mono text-indigo-200 font-bold tracking-[0.2em] uppercase">
              SISTEMA.OPERACIONAL.OK
            </span>
          </div>

          {/* Título */}
          <motion.h1
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-6xl xl:text-7xl font-headline font-black text-white leading-[0.95] tracking-tighter uppercase mt-6"
          >
            AGENDE SUAS<br />AULAS RÁPIDO.
          </motion.h1>

          {/* Descrição */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-base text-white/60 font-medium leading-relaxed max-w-2xl"
          >
            Conecte seu departamento a uma rede unificada de inteligência.
            Experimente o futuro da gestão acadêmica e otimize seu fluxo de agendamentos.
          </motion.p>
        </div>

        {/* Ilustração — meio do painel */}
        <div className="w-full flex-shrink-0 flex-1 flex items-end">
          <motion.img
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
            src="/images/auth-hero.png"
            alt="Ilustração Acadêmica"
            className="w-full h-auto object-contain object-bottom block"
          />
        </div>

        {/* Stats HUD — abaixo da imagem */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-10 px-12 py-4 border-t border-white/10 flex-shrink-0"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">Rede Global</p>
            <p className="text-sm font-headline font-bold text-white tracking-wide">Conectado</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">Status</p>
            <p className="text-sm font-headline font-bold text-white tracking-wide">Operacional</p>
          </div>
        </motion.div>
      </div>

      {/* ── PAINEL DIREITO: Formulário ── */}
      <div className="flex-1 relative bg-surface dark:bg-[#030b1a] p-8 lg:p-24 flex flex-col justify-center transition-colors duration-500">
        {/* Grade sutil de fundo */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg mx-auto space-y-12 relative z-10"
        >
          {/* Cabeçalho */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-core rounded-xl flex items-center justify-center shadow-lg shadow-indigo-core/20">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-sm font-mono font-black uppercase tracking-[0.3em] text-text-primary/40">
                EduEvent Pro
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-headline font-bold text-text-primary tracking-tight">
                Autenticação do Sistema
              </h2>
              <p className="text-text-secondary font-medium">
                Inicie o protocolo de acesso institucional.
              </p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 text-sm font-bold"
            >
              <Cpu size={18} className="animate-pulse" />
              {error}
            </motion.div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-8">
              {/* E-mail */}
              <div className="relative group">
                <div className="absolute -top-3 left-4 bg-surface dark:bg-[#030b1a] px-2 z-10 transition-colors duration-500">
                  <span className="text-[10px] font-mono font-black text-text-secondary/50 group-focus-within:text-indigo-core uppercase tracking-[0.2em]">
                    E-mail Institucional
                  </span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within:text-indigo-core transition-colors" size={18} />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-16 bg-transparent border border-outline-variant/60 dark:border-white/10 rounded-xl pl-16 pr-6 text-text-primary dark:text-white placeholder-text-secondary/20 focus:ring-1 focus:ring-indigo-core focus:border-indigo-core transition-all font-medium text-lg outline-none"
                    placeholder="admin@uninta.edu.br"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="relative group">
                <div className="absolute -top-3 left-4 bg-surface dark:bg-[#030b1a] px-2 z-10 transition-colors duration-500">
                  <span className="text-[10px] font-mono font-black text-text-secondary/50 group-focus-within:text-indigo-core uppercase tracking-[0.2em]">
                    Chave de Acesso
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within:text-indigo-core transition-colors" size={18} />
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-16 bg-transparent border border-outline-variant/60 dark:border-white/10 rounded-xl pl-16 pr-6 text-text-primary dark:text-white placeholder-text-secondary/20 focus:ring-1 focus:ring-indigo-core focus:border-indigo-core transition-all font-medium text-lg outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                  <button type="button" className="text-[10px] font-black text-indigo-core hover:text-indigo-core/80 transition-colors uppercase tracking-widest px-2">
                    Recuperar
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-indigo-core hover:bg-indigo-core/90 text-white rounded-xl font-mono font-black shadow-[0_20px_40px_-10px_rgba(33,112,228,0.3)] transition-all text-lg active:scale-[0.98] group relative overflow-hidden uppercase tracking-[0.2em]"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {loading ? 'Validando Protocolo...' : (
                  <>
                    Iniciar Sessão
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          {/* Registro */}
          <div className="pt-12 border-t border-outline-variant/30 space-y-6">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-medium text-text-secondary text-center">
                Não possui credenciais de acesso?
              </p>
              <button
                onClick={() => setView('signup')}
                className="w-full h-12 bg-surface-container dark:bg-white/5 border border-outline-variant/30 hover:border-indigo-core hover:text-indigo-core text-text-primary rounded-xl font-black transition-all flex items-center justify-center gap-3 group uppercase tracking-widest text-xs"
              >
                <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
                Solicitar Novo Acesso
              </button>
            </div>

            <div className="flex justify-between items-center text-text-secondary/40">
              <div className="flex items-center gap-2">
                <Monitor size={14} />
                <p className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold">SAI v5.2.0-ESTÁVEL</p>
              </div>
              <p className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold">© 2024</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginView;
