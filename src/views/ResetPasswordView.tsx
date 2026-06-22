import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ResetPasswordView = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Token de redefinição não encontrado na URL.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      toast.error("Erro de conexão ao tentar redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden font-sans">
        <div className="flex-1 flex flex-col justify-center items-center px-6 md:px-24 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-card-bg border border-outline-variant rounded-3xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-text-primary mb-2">Senha Atualizada!</h2>
            <p className="text-text-secondary text-sm mb-8">Sua nova senha foi cadastrada com sucesso. Agora você já pode acessar o sistema.</p>
            <a href="/" className="w-full bg-secondary text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all">
              Fazer Login <ArrowRight size={18} />
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden font-sans">
      <div className="flex-1 flex flex-col justify-center items-center px-6 md:px-24 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black font-headline text-text-primary mb-4 tracking-tight">Criar Nova Senha</h1>
            <p className="text-text-secondary text-lg">Digite sua nova senha de acesso abaixo.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">NOVA SENHA</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-text-secondary group-focus-within:text-secondary transition-colors" size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-card-bg border border-outline-variant rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="Mínimo de 6 caracteres"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">CONFIRMAR SENHA</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-text-secondary group-focus-within:text-secondary transition-colors" size={20} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-card-bg border border-outline-variant rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="Repita a nova senha"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-secondary text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : 'ATUALIZAR SENHA'} <ArrowRight size={18} />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
