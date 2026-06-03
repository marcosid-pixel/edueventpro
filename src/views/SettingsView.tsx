import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronRight, Camera, AlertCircle, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isTestMode, apiPatch } from '../utils/index';

const SettingsView = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    photoURL: user?.photoURL || ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/users/${user.id}`);
        const data = await res.json();
        if (data) {
          setProfile({
            displayName: data.displayName || user.displayName || '',
            photoURL: data.photoURL || user.photoURL || ''
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setProfile((prev) => ({ ...prev, photoURL: compressedBase64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error('Falha ao atualizar perfil');
      
      updateUser(profile);
      
      toast('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <nav className="flex items-center gap-2 text-text-secondary text-sm">
        <span>Configurações</span>
        <ChevronRight size={16} />
        <span className="text-text-primary font-semibold">Perfil</span>
      </nav>

      <div className="bg-card-bg p-8 rounded-xl border border-outline-variant shadow-sm transition-colors overflow-hidden">
        <h2 className="text-xl font-bold font-headline mb-6 text-text-primary">Configurações de Perfil</h2>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative group/avatar">
              <img 
                src={profile.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
                className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant shadow-md"
                alt="Profile Preview" 
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                <Camera size={20} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Foto de Perfil</label>
              <div className="flex gap-2">
                <input 
                  value={profile.photoURL}
                  onChange={(e) => setProfile({...profile, photoURL: e.target.value})}
                  className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary transition-colors"
                  placeholder="URL ou selecione uma imagem ao lado"
                />
              </div>
              <p className="text-[10px] text-text-secondary italic">Clique no ícone da câmera na foto para carregar um arquivo (será comprimido automaticamente).</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider ml-1">Nome de Exibição</label>
            <input 
              value={profile.displayName}
              onChange={(e) => setProfile({...profile, displayName: e.target.value})}
              required
              className="w-full h-12 border border-outline-variant rounded-xl bg-surface-container px-4 focus:ring-2 focus:ring-secondary-container outline-none transition-all font-medium text-text-primary" 
              placeholder="Ex: Prof. Ricardo" 
            />
          </div>

          <div className="pt-4">
            <button 
              disabled={loading}
              className="w-full h-14 bg-text-primary text-card-bg rounded-xl font-bold shadow-lg hover:opacity-90 transition-all text-lg active:scale-95 duration-100 disabled:opacity-50"
            >
              {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      </div>

      <div className={`p-6 rounded-xl border transition-all ${user?.pending_delete ? 'bg-orange-50 border-orange-200' : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40'}`}>
        <h3 className={`text-sm font-bold mb-2 ${user?.pending_delete ? 'text-orange-700' : 'text-red-700 dark:text-red-400'}`}>
          {user?.pending_delete ? 'Solicitação em Processamento' : 'Zona de Perigo'}
        </h3>
        <p className={`text-xs mb-4 font-medium italic ${user?.pending_delete ? 'text-orange-600' : 'text-red-600/80 dark:text-red-400/60'}`}>
          {user?.pending_delete 
            ? 'Você solicitou a exclusão da sua conta. Um administrador revisará seu pedido em breve.' 
            : 'A exclusão da conta é permanente e não pode ser desfeita.'}
        </p>
        {!user?.pending_delete ? (
          <button 
            onClick={async () => {
              if (confirm("Deseja enviar uma solicitação de exclusão para os administradores?")) {
                await fetch(`/api/users/${user?.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pending_delete: true })
                });
                if (localStorage.getItem('testMode') !== 'true') await fetch('/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: '🚨 Pedido de Exclusão',
                    message: `O usuário ${user?.displayName} solicitou a exclusão da conta.`,
                    type: 'error',
                    userId: 'admin',
                    createdAt: new Date().toISOString()
                  })
                });
                toast("Solicitação enviada com sucesso.");
                window.location.reload();
              }
            }}
            className="text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-widest hover:underline"
          >
            Solicitar Exclusão de minha conta
          </button>
        ) : (
          <button 
            onClick={async () => {
              await fetch(`/api/users/${user?.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pending_delete: false })
              });
              toast("Solicitação cancelada.");
              window.location.reload();
            }}
            className="text-orange-700 font-bold text-xs uppercase tracking-widest hover:underline"
          >
            Cancelar solicitação de exclusão
          </button>
        )}
      </div>

      {user?.role === 'ADMIN' && (
        <div className="bg-card-bg p-8 rounded-xl border border-outline-variant shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
            <div className="p-2 bg-text-primary/5 rounded-lg">
              <AlertCircle size={20} className="text-text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-headline text-text-primary leading-tight">Ferramentas de Desenvolvedor</h3>
              <p className="text-xs text-text-secondary mt-1">Modo de homologação e limpeza de testes. Visível apenas para administradores.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                const currentMode = localStorage.getItem('testMode') === 'true';
                const newMode = !currentMode;
                localStorage.setItem('testMode', String(newMode));
                toast(newMode ? 'Modo de testes ativado. Ações não vão gerar relatórios/auditoria.' : 'Modo de testes desativado. Ações voltarão a gerar relatórios.');
                window.location.reload();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs uppercase tracking-widest rounded-xl transition-all border ${localStorage.getItem('testMode') === 'true' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 shadow-inner' : 'bg-surface-container text-text-secondary border-outline-variant hover:border-text-primary hover:text-text-primary'}`}
            >
              <Settings size={16} />
              {localStorage.getItem('testMode') === 'true' ? 'Modo Teste: ATIVADO' : 'Modo Teste: DESATIVADO'}
            </button>

            <button
              onClick={async () => {
                if (!confirm('Deseja realmente apagar todo o histórico de auditoria e relatórios? Isso não pode ser desfeito.')) return;
                try {
                  await fetch('/api/activity_logs/all', { method: 'DELETE' });
                  toast('Auditoria e logs limpos com sucesso!');
                } catch (err) {
                  toast('Erro ao limpar auditoria.');
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 text-red-600 border border-red-500/20 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all shadow-sm"
            >
              <Trash2 size={16} />
              Zerar Auditoria
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsView;
