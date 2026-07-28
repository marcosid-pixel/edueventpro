import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Clock, Calendar, MapPin, Loader2, GraduationCap } from 'lucide-react';

interface TokenStatus {
  valid: boolean;
  error?: string;
  used?: boolean;
  expired?: boolean;
  event?: {
    title: string;
    date: string;
    timeStart?: string;
    timeEnd?: string;
    location?: string;
  };
}

interface ConfirmResult {
  success: boolean;
  message?: string;
  error?: string;
  event?: {
    title: string;
    date: string;
    timeStart?: string;
    timeEnd?: string;
    location?: string;
  };
}

export default function ConfirmView() {
  const [token, setToken] = useState<string>('');
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || window.location.pathname.split('/confirm/')[1];
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      setLoading(false);
      setStatus({ valid: false, error: 'Token não fornecido' });
    }
  }, []);

  const verifyToken = async (t: string) => {
    try {
      const response = await fetch(`/api/emails/token-status/${t}`);
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setStatus({ valid: false, error: 'Erro ao verificar token' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`/api/emails/confirm/${token}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: 'Erro ao confirmar presença' });
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <Loader2 size={48} className="mx-auto text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Verificando token...</p>
        </motion.div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Presença Confirmada!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Sua presença foi confirmada com sucesso.
          </p>
          
          {result.event && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left mb-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-3">{result.event.title}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar size={14} className="text-indigo-500" />
                  <span>{formatDate(result.event.date)}</span>
                </div>
                {result.event.timeStart && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock size={14} className="text-indigo-500" />
                    <span>{result.event.timeStart} - {result.event.timeEnd}</span>
                  </div>
                )}
                {result.event.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin size={14} className="text-indigo-500" />
                    <span>{result.event.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-500">
            Você receberá um e-mail de confirmação.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">EduEvent Pro</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Confirmação de Presença</p>
        </div>

        {/* Error States */}
        {!status?.valid && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {status?.used ? 'Token Já Utilizado' : 
               status?.expired ? 'Token Expirado' : 
               'Token Inválido'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {status?.error || 'Este link de confirmação não é válido.'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Solicite um novo e-mail de confirmação ao administrador.
            </p>
          </div>
        )}

        {/* Confirmation Form */}
        {status?.valid && status.event && (
          <>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-3">{status.event.title}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar size={14} className="text-indigo-500" />
                  <span>{formatDate(status.event.date)}</span>
                </div>
                {status.event.timeStart && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock size={14} className="text-indigo-500" />
                    <span>{status.event.timeStart} - {status.event.timeEnd}</span>
                  </div>
                )}
                {status.event.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin size={14} className="text-indigo-500" />
                    <span>{status.event.location}</span>
                  </div>
                )}
              </div>
            </div>

            {result?.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Confirmar Presença
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-4">
              Ao confirmar, você está atestando que esta aula foi realizada.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
