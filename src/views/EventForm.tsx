import { useState } from 'react';
import {
  ChevronRight,
  CalendarClock,
  AlertCircle,
  Trash2,
  Calendar,
  Clock,
  Info,
  ChevronDown,
  RefreshCw,
  Package,
  Video,
  Globe,
  GraduationCap,
  Users,
  UserPlus,
  Info as InfoIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import type { View, AcademicEvent, Course, User } from '../types';
import { EVENT_CATEGORIES, ACADEMIC_COURSES } from '../constants';
import { parseCategories, isTestMode, apiPost } from '../utils/index';

const EventForm = ({ setView, initialData }: { setView: (v: View) => void, initialData?: AcademicEvent | null }) => {
  const { user } = useAuth();
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const { data: users } = useRealtimeCollection<User>('users');
  const { data: allEventsData } = useRealtimeCollection<AcademicEvent>('events');
  const [loading, setLoading] = useState(false);

  // Derive courses from both formal DB and active events
  const formalCourseNames = courses.map(c => c.name);
  const eventCourseNames = Array.from(new Set(allEventsData.map(e => e.course).filter(Boolean)));
  const allAvailableCourseNames = Array.from(new Set([...ACADEMIC_COURSES, ...formalCourseNames, ...eventCourseNames])).sort();

  const handleUpdateCourseData = async (courseId: string, data: any) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Falha ao atualizar curso');
    } catch (err) {
      console.error(err);
      toast('Erro ao atualizar categoria do curso');
    }
  };

  const [showLogistics, setShowLogistics] = useState(initialData?.plataforma_meet || initialData?.plataforma_comapos || false);
  const [showAdvanced, setShowAdvanced] = useState(initialData?.convidado_externo || initialData?.precisa_cabine || false);
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    type: initialData?.type || 'ENAMED',
    course: initialData?.course || 'Ciência da Computação',
    description: initialData?.description || '',
    date: initialData?.date || '',
    timeStart: initialData?.time?.split(' - ')[0] || '',
    timeEnd: initialData?.time?.split(' - ')[1] || '',
    location: initialData?.location || 'Meet',
    cabinInfo: initialData?.cabinInfo || '',
    speaker: initialData?.speaker || '',
    plataforma_meet: initialData?.plataforma_meet || false,
    plataforma_comapos: initialData?.plataforma_comapos || false,
    convidado_externo: initialData?.convidado_externo || false,
    precisa_cabine: initialData?.precisa_cabine || false,
    category: initialData?.category || '',
    teacher: initialData?.teacher || '',
    isRecurring: false,
    recurringWeeks: 4
  });

  const isEditing = !!initialData;
  const isAdmin = user?.role === 'ADMIN';
  const isProfessor = user?.role === 'PROFESSOR';
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'reschedule'>('info');
  const [newRescheduleDate, setNewRescheduleDate] = useState(initialData?.date || '');
  const [newTimeStart, setNewTimeStart] = useState(initialData?.time?.split(' - ')[0] || '');
  const [newTimeEnd, setNewTimeEnd] = useState(initialData?.time?.split(' - ')[1] || '');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const openRescheduleModal = () => {
    setNewRescheduleDate(formData.date);
    setNewTimeStart(formData.timeStart);
    setNewTimeEnd(formData.timeEnd);
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleReschedule = async () => {
    if (!newRescheduleDate) {
      toast('Informe a nova data do reagendamento.');
      return;
    }
    if (isProfessor && !rescheduleReason.trim()) {
      toast('Como docente, você deve informar o motivo do reagendamento.');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/events_update/${initialData!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newRescheduleDate,
          time: `${newTimeStart} - ${newTimeEnd}`,
          timeStart: newTimeStart,
          timeEnd: newTimeEnd,
          status: 'Confirmed',
          notificar_admin: isProfessor ? 1 : 0,
          cancelReason: rescheduleReason || null,
          updatedAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Falha ao reagendar');

      const reasonNote = rescheduleReason ? ` Motivo: ${rescheduleReason}` : '';

      if (!isTestMode()) await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Aula Reagendada',
          message: `A aula "${formData.title}" foi reagendada por ${user?.displayName} para ${newRescheduleDate} às ${newTimeStart}.${reasonNote}`,
          type: 'warning',
          userId: user?.id,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      });

      if (!isTestMode()) await fetch('/api/activity_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isProfessor ? 'Reagendamento por Docente' : 'Reagendamento Administrativo',
          message: `"${formData.title}" reagendada de ${formData.date} para ${newRescheduleDate}.${reasonNote}`,
          type: 'warning',
          action: 'RESCHEDULE_EVENT',
          userId: user?.id,
          userName: user?.displayName,
          userRole: user?.role,
          userPhotoURL: user?.photoURL,
          courseName: formData.course,
          eventId: initialData!.id,
          eventTitle: formData.title,
          createdAt: new Date().toISOString()
        })
      });

      toast('Aula reagendada com sucesso!');
      setShowRescheduleModal(false);
      setRescheduleReason('');
      setView('unified-calendar');
    } catch (err) {
      console.error(err);
      toast('Erro ao reagendar a aula');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Regra: Professor não cria do zero
    if (!isEditing && isProfessor) {
      toast('Apenas administradores podem realizar essa alteração.');
      return;
    }

    if (!formData.title || !formData.date) return toast('Título e data são obrigatórios');
    
    // Regra: Descrição min 20 caracteres para admin, 150 para professor na criação
    const minDesc = isAdmin ? 20 : 150;
    if (!isEditing && formData.description.length < minDesc) {
      toast(`A descrição deve ter no mínimo ${minDesc} caracteres. Atual: ${formData.description.length}. Por favor, detalhe mais os objetivos acadêmicos.`);
      return;
    }

    setLoading(true);
    try {
      const isCreate = !isEditing;
      
      const createEvent = async (date: string, suffix: string = '', bId?: string) => {
        const payload = {
          ...formData,
          title: suffix ? `${formData.title} (${suffix})` : formData.title,
          date,
          time: `${formData.timeStart} - ${formData.timeEnd}`,
          status: isCreate ? 'Confirmed' : (initialData?.status || 'Confirmed'),
          createdBy: isCreate ? user?.id : initialData?.createdBy,
          teacher: formData.teacher || (isCreate ? user?.displayName : initialData?.teacher),
          notificar_admin: isProfessor && isEditing ? 1 : 0,
          updatedAt: new Date().toISOString(),
          plataforma_meet: formData.plataforma_meet ? 1 : 0,
          plataforma_comapos: formData.plataforma_comapos ? 1 : 0,
          convidado_externo: formData.convidado_externo ? 1 : 0,
          precisa_cabine: formData.precisa_cabine ? 1 : 0,
          category: formData.category,
          batchId: bId || initialData?.batchId || null
        };
        
        // Ensure ONLY columns that exist in DB are sent
        // Clean payload: remove UI-only fields
        const { isRecurring, recurringWeeks, ...finalPayload } = payload as any;

        const response = await fetch(isCreate ? '/api/events' : `/api/events_update/${initialData.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload)
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Falha ao salvar evento');
        }
        return await response.json();
      };

      if (isCreate && formData.isRecurring) {
        // Lógica de agendamento em lote
        const bId = `LOTE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const baseDate = new Date(formData.date + 'T12:00:00'); 
        for (let i = 0; i < formData.recurringWeeks; i++) {
          const nextDate = new Date(baseDate);
          nextDate.setDate(baseDate.getDate() + (i * 7));
          const dateStr = nextDate.toISOString().split('T')[0];
          // Novo padrão: "Titulo do Evento (Aula X)"
          await createEvent(dateStr, `Aula ${i + 1}`, bId);
        }
        
        // Log de criação em lote
        if (!isTestMode()) await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Série de Agendamentos Criada',
            message: `${user?.displayName} criou uma série de ${formData.recurringWeeks} aulas para: "${formData.title}" (${formData.course})`,
            type: 'success',
            userId: user?.id,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          })
        });
        if (!isTestMode()) await fetch('/api/activity_logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Série de Agendamentos Criada',
            message: `Lote de ${formData.recurringWeeks} aulas para "${formData.title}"`,
            type: 'success',
            action: 'CREATE_BATCH',
            userId: user?.id,
            userName: user?.displayName,
            userRole: user?.role,
            userPhotoURL: user?.photoURL,
            courseName: formData.course,
            eventTitle: formData.title,
            createdAt: new Date().toISOString()
          })
        });
      } else {
        await createEvent(formData.date);
        
        // Log de criação normal (se for admin criando)
        if (isCreate) {
          if (!isTestMode()) await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Novo Agendamento Criado',
              message: `${user?.displayName} criou o evento "${formData.title}" (${formData.course}) para ${formData.date}.`,
              type: 'info',
              userId: user?.id,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            })
          });
          if (!isTestMode()) await fetch('/api/activity_logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Novo Agendamento Criado',
              message: `Evento "${formData.title}" criado para ${formData.date}`,
              type: 'info',
              action: 'CREATE_EVENT',
              userId: user?.id,
              userName: user?.displayName,
              userRole: user?.role,
              userPhotoURL: user?.photoURL,
              courseName: formData.course,
              eventTitle: formData.title,
              createdAt: new Date().toISOString()
            })
          });
        }

        // Se for uma edição de professor, geramos um log/notificação para o Admin
                if (isEditing && isProfessor) {
          if (!isTestMode()) await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Alteração em Agendamento',
              message: `O Prof. ${user?.displayName} modificou o evento: "${formData.title}" (${formData.course})`,
              type: 'warning',
              userId: user?.id,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            })
          });
        }
        
        if (isEditing) {
          if (!isTestMode()) await fetch('/api/activity_logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Alteração em Agendamento',
              message: `${user?.displayName} editou "${formData.title}"`,
              type: isProfessor ? 'warning' : 'info',
              action: 'EDIT_EVENT',
              userId: user?.id,
              userName: user?.displayName,
              courseName: formData.course,
              eventId: initialData?.id,
              eventTitle: formData.title,
              createdAt: new Date().toISOString()
            })
          });
        }

        // Se for edição feita por admin
        if (isEditing && isAdmin) {
          if (!isTestMode()) await fetch('/api/activity_logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Evento Editado (Admin)',
              message: `Admin ${user?.displayName} editou "${formData.title}"`,
              type: 'info',
              action: 'EDIT_EVENT',
              userId: user?.id,
              userName: user?.displayName,
              userRole: user?.role,
              userPhotoURL: user?.photoURL,
              courseName: formData.course,
              eventId: initialData?.id,
              eventTitle: formData.title,
              createdAt: new Date().toISOString()
            })
          });
        }
      }
      
      toast(isCreate ? 'Evento cadastrado com sucesso!' : 'Evento atualizado com sucesso!');
      setView('unified-calendar');
    } catch (error: any) {
      console.error("Error adding event:", error);
      toast('Erro ao salvar evento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in slide-in-from-right-4 duration-500">
      <nav className="flex items-center gap-2 mb-6 text-text-secondary text-sm">
        <span>Eventos</span>
        <ChevronRight size={14} />
        <span className="font-bold text-secondary">Novo Agendamento</span>
      </nav>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-text-primary tracking-tight">
            {isEditing ? 'Edição de Evento' : 'Cadastro de Novo Evento'}
          </h1>
          <p className="text-sm text-text-secondary italic">
            {isProfessor ? 'Você pode editar apenas horário e logística.' : 'Preencha os detalhes para agendamento acadêmico.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setView('events')} className="px-6 py-2 bg-card-bg border border-outline-variant text-text-secondary font-bold text-xs rounded-lg hover:bg-surface-container transition-all font-headline tracking-wide uppercase">Descartar</button>
          {isEditing && (
            <>
              {initialData.status === 'Cancelled' ? (
                <button
                  onClick={openRescheduleModal}
                  className="px-6 py-2 bg-green-500/10 text-green-600 border border-green-500/20 font-bold text-xs rounded-lg hover:bg-green-500/20 transition-all font-headline tracking-wide uppercase flex items-center gap-2"
                >
                  <CalendarClock size={14} /> Reagendar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-6 py-2 bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold text-xs rounded-lg hover:bg-orange-500/20 transition-all font-headline tracking-wide uppercase flex items-center gap-2"
                  >
                    <AlertCircle size={14} /> Cancelar Aula
                  </button>
                  <button
                    onClick={openRescheduleModal}
                    className="px-6 py-2 bg-secondary/10 text-secondary border border-secondary/20 font-bold text-xs rounded-lg hover:bg-secondary/20 transition-all font-headline tracking-wide uppercase flex items-center gap-2"
                  >
                    <CalendarClock size={14} /> Reagendar
                  </button>
                </>
              )}
              {/* Exclusão: admin exclui diretamente, professor solicita aprovação */}
              {isProfessor ? (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Solicitar EXCLUSÃO da aula ao Administrador?\n\n"${formData.title}"\nData: ${formData.date}\n\nSua solicitação será registrada e o Admin será notificado para aprovação.`)) return;
                    try {
                      setLoading(true);
                      await fetch('/api/notifications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: '⚠️ Solicitação de Exclusão de Aula',
                          message: `Prof. ${user?.displayName} solicitou a exclusão de "${formData.title}" (${formData.date}, ${formData.course}). Acesse a aula para aprovar ou rejeitar a exclusão.`,
                          type: 'warning',
                          userId: user?.id,
                          updatedAt: new Date().toISOString(),
                          createdAt: new Date().toISOString()
                        })
                      });
                      await fetch('/api/activity_logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: 'Solicitação de Exclusão',
                          message: `Prof. ${user?.displayName} solicitou exclusão de "${formData.title}" (${formData.date}).`,
                          type: 'warning',
                          action: 'REQUEST_DELETE_EVENT',
                          userId: user?.id,
                          userName: user?.displayName,
                          userRole: user?.role,
                          userPhotoURL: user?.photoURL,
                          courseName: formData.course,
                          eventId: initialData.id,
                          eventTitle: formData.title,
                          createdAt: new Date().toISOString()
                        })
                      });
                      toast('Solicitação enviada! O administrador será notificado.');
                      setView('unified-calendar');
                    } catch (err) { toast('Erro ao enviar solicitação'); } finally { setLoading(false); }
                  }}
                  className="px-6 py-2 bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold text-xs rounded-lg hover:bg-orange-500/20 transition-all font-headline tracking-wide uppercase flex items-center gap-2"
                >
                  <Trash2 size={14} /> Solicitar Exclusão
                </button>
              ) : (
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Deseja EXCLUIR permanentemente o evento:\n\n"${formData.title}"\nData: ${formData.date}\n\nEsta ação não pode ser desfeita.`)) {
                      try {
                        setLoading(true);
                        const response = await fetch(`/api/events_delete/${initialData.id}`, { method: 'POST' });
                        if (!response.ok) throw new Error('Falha ao excluir');
                        if (!isTestMode()) await fetch('/api/activity_logs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: 'Evento Excluído',
                            message: `O evento "${formData.title}" (${formData.date}) foi excluído permanentemente.`,
                            type: 'error',
                            action: 'DELETE_EVENT',
                            userId: user?.id,
                            userName: user?.displayName,
                            userRole: user?.role,
                            userPhotoURL: user?.photoURL,
                            courseName: formData.course,
                            eventId: initialData.id,
                            eventTitle: formData.title,
                            createdAt: new Date().toISOString()
                          })
                        });
                        if (!isTestMode()) await fetch('/api/notifications', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: 'Evento Excluído',
                            message: `${user?.displayName} excluiu o evento "${formData.title}" (${formData.date}) do curso ${formData.course}.`,
                            type: 'error',
                            userId: user?.id,
                            updatedAt: new Date().toISOString(),
                            createdAt: new Date().toISOString()
                          })
                        });
                        toast('Evento excluído!');
                        setView('unified-calendar');
                      } catch (err) { console.error(err); toast('Erro ao excluir evento'); } finally { setLoading(false); }
                    }
                  }}
                  className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-xs rounded-lg hover:bg-red-500/20 transition-all font-headline tracking-wide uppercase flex items-center gap-2"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              )}
            </>
          )}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-secondary-container text-white font-bold text-xs rounded-lg hover:opacity-90 transition-all shadow-md font-headline tracking-wide disabled:opacity-50 uppercase"
          >
            {loading ? 'Salvando...' : (isEditing ? 'Salvar Edição' : 'Salvar Evento')}
          </button>
        </div>
      </div>

      {/* Modal Cancelar Aula */}
      <AnimatePresence>
        {showCancelModal && isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-bg w-full max-w-lg rounded-3xl border border-outline-variant shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
            >
              <div className="p-6 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container/30">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5">
                  <AlertCircle size={20} className="text-orange-600" /> Cancelar Aula
                </h2>
                <button 
                  onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                  className="text-text-secondary hover:text-text-primary transition-colors text-xs font-bold"
                >
                  Fechar
                </button>
              </div>
              
              <div className="p-7 space-y-6">
                {/* Detalhes da aula */}
                <div className="bg-surface-container/40 rounded-2xl p-5 border border-outline-variant/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Dados do Evento a Cancelar</p>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">{formData.title}</h3>
                  <div className="grid grid-cols-2 gap-3 text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-orange-500/80" />
                      <span className="text-xs font-semibold">{formData.date ? new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sem data'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-orange-500/80" />
                      <span className="text-xs font-semibold">{formData.timeStart} - {formData.timeEnd}</span>
                    </div>
                  </div>
                </div>

                {/* Motivo do Cancelamento */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block ml-1">
                    Motivo do Cancelamento{' '}
                    {isProfessor
                      ? <span className="text-red-500 font-extrabold">*</span>
                      : <span className="text-text-secondary/50 font-normal normal-case">(Opcional)</span>
                    }
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={isProfessor
                      ? 'Informe detalhadamente o motivo do cancelamento desta aula (Ex: Licença médica, choque de horários, imprevisto pessoal, etc)...'
                      : 'Observação administrativa sobre o cancelamento (opcional)...'
                    }
                    className="w-full border border-outline-variant rounded-xl bg-surface-container/60 p-4 text-xs font-medium focus:ring-2 focus:ring-orange-500/30 transition-all outline-none resize-none h-28 text-text-primary"
                  />
                  <p className="text-[9px] text-text-secondary/70 italic ml-1">
                    {isProfessor
                      ? 'Obrigatório para docentes — a justificativa será registrada e enviada à coordenação para auditoria.'
                      : 'Administradores podem cancelar sem justificativa. A ação ficará registrada nos relatórios.'
                    }
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                    className="flex-1 h-11 bg-surface-container text-text-secondary font-bold text-xs uppercase tracking-wider rounded-xl border border-outline-variant/60 hover:bg-card-bg transition-all"
                  >
                    Voltar
                  </button>
                   <button
                    onClick={async () => {
                      if (isProfessor && !cancelReason.trim()) {
                        toast('Como docente, você deve informar o motivo do cancelamento.');
                        return;
                      }
                      try {
                        setLoading(true);
                        const reasonNote = cancelReason.trim() ? ` Motivo: ${cancelReason}` : '';

                        // Cancelar
                        const response = await fetch(`/api/events_update/${initialData.id}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            status: 'Cancelled',
                            cancelReason: cancelReason || null,
                            notificar_admin: isProfessor ? 1 : 0,
                            updatedAt: new Date().toISOString()
                          })
                        });
                        if (!response.ok) throw new Error('Falha ao cancelar');

                        // Notificação
                        if (!isTestMode()) await fetch('/api/notifications', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: 'Aula Cancelada',
                            message: `A aula "${formData.title}" (${formData.date}) foi cancelada por ${user?.displayName}.${reasonNote}`,
                            type: 'warning',
                            userId: user?.id,
                            updatedAt: new Date().toISOString(),
                            createdAt: new Date().toISOString()
                          })
                        });

                        // Activity log
                        if (!isTestMode()) await fetch('/api/activity_logs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: isProfessor ? 'Cancelamento por Docente' : 'Cancelamento Administrativo',
                            message: `Aula "${formData.title}" (${formData.date}) cancelada por ${user?.displayName}.${reasonNote}`,
                            type: 'warning',
                            action: 'CANCEL_EVENT',
                            userId: user?.id,
                            userName: user?.displayName,
                            userRole: user?.role,
                            userPhotoURL: user?.photoURL,
                            courseName: formData.course,
                            eventId: initialData.id,
                            eventTitle: formData.title,
                            createdAt: new Date().toISOString()
                          })
                        });

                        toast('Aula cancelada com sucesso!');
                        setShowCancelModal(false);
                        setCancelReason('');
                        setView('unified-calendar');
                      } catch (err) {
                        console.error(err);
                        toast('Erro ao cancelar a aula');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || (isProfessor && !cancelReason.trim())}
                    className={`flex-1 h-11 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                      isProfessor && !cancelReason.trim()
                        ? 'bg-surface-container text-text-secondary cursor-not-allowed border border-outline-variant/60'
                        : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                    }`}
                  >
                    {loading ? 'Cancelando...' : (
                      <><AlertCircle size={15} /> Confirmar Cancelamento</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Reagendar Aula */}
      <AnimatePresence>
        {showRescheduleModal && isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-bg w-full max-w-lg rounded-3xl border border-outline-variant shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container/30">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5">
                  <CalendarClock size={20} className="text-secondary" />
                  Reagendar Aula
                </h2>
                <button
                  onClick={() => { setShowRescheduleModal(false); setRescheduleReason(''); }}
                  className="text-text-secondary hover:text-text-primary transition-colors text-xs font-bold"
                >
                  Fechar
                </button>
              </div>

              <div className="p-7 space-y-6">
                {/* Current event details */}
                <div className="bg-surface-container/40 rounded-2xl p-5 border border-outline-variant/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Dados do Evento</p>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">{formData.title}</h3>
                  <div className="grid grid-cols-2 gap-3 text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-secondary/80" />
                      <span className="text-xs font-semibold">
                        {formData.date ? new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sem data'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-secondary/80" />
                      <span className="text-xs font-semibold">{formData.timeStart} – {formData.timeEnd}</span>
                    </div>
                  </div>
                </div>

                {/* New date and time */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarClock size={12} /> Nova Data & Horário
                  </p>
                  <div className="space-y-1.5 text-text-secondary">
                    <label className="text-[10px] font-bold uppercase tracking-wider block ml-1">Nova Data</label>
                    <input
                      type="date"
                      value={newRescheduleDate}
                      onChange={(e) => setNewRescheduleDate(e.target.value)}
                      className="w-full h-11 border border-outline-variant rounded-xl bg-surface-container/60 px-3 text-sm focus:ring-2 focus:ring-secondary/30 transition-all outline-none text-text-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-text-secondary">
                      <label className="text-[10px] font-bold uppercase tracking-wider block ml-1">Novo Início</label>
                      <input
                        type="time"
                        value={newTimeStart}
                        onChange={(e) => setNewTimeStart(e.target.value)}
                        className="w-full h-11 border border-outline-variant rounded-xl bg-surface-container/60 px-3 text-sm focus:ring-2 focus:ring-secondary/30 transition-all outline-none text-text-primary"
                      />
                    </div>
                    <div className="space-y-1.5 text-text-secondary">
                      <label className="text-[10px] font-bold uppercase tracking-wider block ml-1">Novo Fim</label>
                      <input
                        type="time"
                        value={newTimeEnd}
                        onChange={(e) => setNewTimeEnd(e.target.value)}
                        className="w-full h-11 border border-outline-variant rounded-xl bg-surface-container/60 px-3 text-sm focus:ring-2 focus:ring-secondary/30 transition-all outline-none text-text-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Justification — required for professor, optional for admin */}
                {isProfessor ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block ml-1">
                      Motivo do Reagendamento <span className="text-red-500 font-extrabold">*</span>
                    </label>
                    <textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Informe detalhadamente o motivo do reagendamento desta aula (Ex: imprevisto pessoal, conflito de agenda, problema técnico, etc)..."
                      className="w-full border border-outline-variant rounded-xl bg-surface-container/60 p-4 text-xs font-medium focus:ring-2 focus:ring-secondary/30 transition-all outline-none resize-none h-28 text-text-primary"
                      required
                    />
                    <p className="text-[9px] text-text-secondary/70 italic ml-1">
                      Obrigatório para docentes — a justificativa será registrada e enviada à coordenação para auditoria.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block ml-1">
                      Observação <span className="text-text-secondary/50 font-normal normal-case">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Ex: solicitação do docente, realocação de sala..."
                      className="w-full h-11 border border-outline-variant rounded-xl bg-surface-container/60 px-4 text-xs font-medium focus:ring-2 focus:ring-secondary/30 transition-all outline-none text-text-primary"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowRescheduleModal(false); setRescheduleReason(''); }}
                    className="flex-1 h-11 bg-surface-container text-text-secondary font-bold text-xs uppercase tracking-wider rounded-xl border border-outline-variant/60 hover:bg-card-bg transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={loading || !newRescheduleDate || (isProfessor && !rescheduleReason.trim())}
                    className={`flex-1 h-11 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                      !newRescheduleDate || (isProfessor && !rescheduleReason.trim())
                        ? 'bg-surface-container text-text-secondary cursor-not-allowed border border-outline-variant/60'
                        : 'bg-secondary text-white hover:bg-secondary-container active:scale-95'
                    }`}
                  >
                    {loading ? 'Reagendando...' : (
                      <><CalendarClock size={15} /> Confirmar Reagendamento</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-6">
          <div className="bg-card-bg p-8 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-secondary-container transition-colors">
            <h3 className="text-xs font-bold text-secondary-container mb-8 flex items-center gap-2 uppercase tracking-widest font-headline">
              <Info size={16} /> Informações Básicas
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 text-text-secondary">
                  <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Tipo de Evento</label>
                  <select 
                    value={formData.type}
                    disabled={isProfessor}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm focus:ring-2 focus:ring-secondary-container transition-all outline-none text-text-primary disabled:opacity-60"
                  >
                    {EVENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 text-text-secondary">
                  <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Título do Evento</label>
                  <input 
                    value={formData.title}
                    disabled={isProfessor}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm focus:ring-2 focus:ring-secondary-container transition-all outline-none text-text-primary disabled:opacity-60" 
                    placeholder="Ex: IA na Medicina" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 text-text-secondary">
                  <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Curso Relacionado</label>
                  <select 
                    value={formData.course}
                    disabled={isProfessor}
                    onChange={(e) => setFormData({...formData, course: e.target.value, category: ''})}
                    className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary disabled:opacity-60"
                  >
                    <option value="">Selecione um curso...</option>
                    {allAvailableCourseNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 text-text-secondary">
                  <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Categoria (Filtro)</label>
                  <div className="relative group">
                    <select 
                      value={formData.category}
                      disabled={isProfessor || !formData.course}
                      onChange={(e) => {
                        if (e.target.value === 'NEW_CATEGORY') {
                          const newCat = prompt('Digite o nome da nova categoria tecnológica/acadêmica:');
                          if (newCat) {
                             const currentCourse = courses.find(c => c.name === formData.course);
                             if (currentCourse) {
                               const updatedCats = [...(currentCourse.categories || []), newCat];
                               handleUpdateCourseData(currentCourse.id, { categories: JSON.stringify(updatedCats) });
                               setFormData({...formData, category: newCat});
                             }
                          }
                        } else {
                          setFormData({...formData, category: e.target.value});
                        }
                      }}
                      className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary disabled:opacity-60 appearance-none pr-10"
                    >
                      <option value="">Selecione uma categoria...</option>
                      {parseCategories(courses.find(c => c.name === formData.course)?.categories).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {isAdmin && formData.course && (
                        <option value="NEW_CATEGORY" className="text-secondary font-bold">+ Cadastrar Nova Categoria...</option>
                      )}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 text-text-secondary">
                  <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Professor Responsável</label>
                  <div className="relative group">
                    <select 
                      value={formData.teacher}
                      disabled={isProfessor || !formData.course}
                      onChange={(e) => setFormData({...formData, teacher: e.target.value})}
                      className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary disabled:opacity-60 appearance-none pr-10"
                    >
                      <option value="">Selecione um professor...</option>
                      {users
                        .filter(u => {
                          const course = courses.find(c => c.name === formData.course);
                          return u.courseId === course?.id || u.role === 'ADMIN';
                        })
                        .map(u => (
                          <option key={u.id} value={u.displayName}>{u.displayName} ({u.role})</option>
                        ))
                      }
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  {!formData.course && <p className="text-[9px] text-text-secondary italic ml-1">* Selecione o curso primeiro</p>}
                </div>
                <div className="space-y-1.5 text-text-secondary opacity-50">
                   <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">ID Fiscal / Matrícula</label>
                   <div className="w-full h-11 border border-outline-variant rounded-lg bg-surface-container px-3 flex items-center text-xs font-mono">
                      {users.find(u => u.displayName === formData.teacher)?.id.substring(0,8).toUpperCase() || '---'}
                   </div>
                </div>
              </div>
              <div className="space-y-1.5 text-text-secondary">
                <div className="flex justify-between items-center mb-1 px-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider block">Descrição / Detalhes</label>
                  <span className={`text-[10px] font-black tracking-tighter ${formData.description.length < 150 ? 'text-red-500' : 'text-green-500'}`}>
                    {formData.description.length} / 150 MÍNIMO
                  </span>
                </div>
                <textarea 
                  value={formData.description}
                  disabled={isProfessor}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-outline-variant rounded-lg bg-surface-container p-4 text-sm focus:ring-2 focus:ring-secondary-container transition-all outline-none resize-none h-32 text-text-primary disabled:opacity-60" 
                  placeholder="Descreva os objetivos acadêmicos da atividade (mínimo 150 caracteres)..."
                ></textarea>
                <p className="text-right text-[10px] text-text-secondary font-mono font-medium italic mt-1">Obrigatório detalhamento técnico completo.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-card-bg p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-secondary-container transition-colors">
             <h3 className="text-xs font-bold text-secondary-container mb-6 flex items-center gap-2 uppercase tracking-widest font-headline">
              <Clock size={16} /> Horário
            </h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5 text-text-secondary">
                  <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Data</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full h-11 border border-outline-variant rounded-lg bg-card-bg px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary" 
                  />
                </div>
                {!isEditing && (
                  <div className="space-y-2 text-text-secondary">
                    <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Divisão em Partes (Semanal)</label>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setFormData({...formData, isRecurring: !formData.isRecurring})}
                        className={`flex-1 h-11 rounded-lg border border-outline-variant transition-all flex items-center justify-center gap-2 text-xs font-bold ${formData.isRecurring ? 'bg-secondary text-white border-secondary' : 'bg-surface-container text-text-secondary'}`}
                      >
                        <RefreshCw size={14} className={formData.isRecurring ? 'animate-spin-slow' : ''} />
                        {formData.isRecurring ? 'Série Ativada' : 'Repetir Semanal'}
                      </button>
                      {formData.isRecurring && (
                        <select 
                          value={formData.recurringWeeks}
                          onChange={(e) => setFormData({...formData, recurringWeeks: parseInt(e.target.value)})}
                          className="w-24 h-11 border border-outline-variant rounded-lg bg-surface-container px-3 text-sm outline-none text-text-primary font-bold"
                        >
                          <option value={2}>2 Momentos</option>
                          <option value={4}>4 Momentos</option>
                          <option value={8}>8 Momentos</option>
                          <option value={12}>12 Momentos</option>
                        </select>
                      )}
                    </div>
                    {formData.isRecurring && (
                      <p className="text-[10px] italic text-secondary font-medium px-1">
                        Serão criados {formData.recurringWeeks} agendamentos automáticos (1 por semana) com sufixo "Aula X".
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-text-secondary">
                   <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Início</label>
                   <input 
                    type="time" 
                    value={formData.timeStart}
                    onChange={(e) => setFormData({...formData, timeStart: e.target.value})}
                    className="w-full h-11 border border-outline-variant rounded-lg bg-card-bg px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary" 
                  />
                </div>
                <div className="space-y-1.5 text-text-secondary">
                   <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Fim</label>
                   <input 
                    type="time" 
                    value={formData.timeEnd}
                    onChange={(e) => setFormData({...formData, timeEnd: e.target.value})}
                    className="w-full h-11 border border-outline-variant rounded-lg bg-card-bg px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card-bg p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-secondary-container transition-colors">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xs font-bold text-secondary-container flex items-center gap-2 uppercase tracking-widest font-headline">
                <Package size={16} /> Logística
               </h3>
               <button 
                 onClick={() => setShowLogistics(!showLogistics)}
                 className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${showLogistics ? 'bg-secondary text-white border-secondary' : 'bg-surface-container text-text-secondary border-outline-variant'}`}
               >
                 {showLogistics ? 'Habilitado' : 'Desabilitado'}
               </button>
             </div>
            
            {showLogistics ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest ml-1">Plataforma Digital</p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setFormData({...formData, plataforma_meet: !formData.plataforma_meet})}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all ${formData.plataforma_meet ? 'border-secondary bg-secondary/5 text-secondary' : 'border-outline-variant text-text-secondary hover:bg-surface-container'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Video size={18} />
                        <span className="text-xs font-bold">Google Meet</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.plataforma_meet ? 'bg-secondary' : 'bg-outline-variant'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.plataforma_meet ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, plataforma_comapos: !formData.plataforma_comapos})}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all ${formData.plataforma_comapos ? 'border-secondary bg-secondary/5 text-secondary' : 'border-outline-variant text-text-secondary hover:bg-surface-container'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe size={18} />
                        <span className="text-xs font-bold">Comapos</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.plataforma_comapos ? 'bg-secondary' : 'bg-outline-variant'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.plataforma_comapos ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest ml-1">Local Físico</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, location: 'Meet'})}
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all group active:scale-95 ${formData.location === 'Meet' ? 'border-secondary-container bg-secondary-container/5 text-secondary' : 'border-outline-variant text-text-secondary hover:border-secondary-container hover:text-secondary'}`}
                    >
                      <Video size={24} />
                      <span className="text-xs font-black uppercase tracking-tighter">Somente Online</span>
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, location: 'Campus'})}
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all group active:scale-95 ${formData.location === 'Campus' ? 'border-secondary-container bg-secondary-container/5 text-secondary' : 'border-outline-variant text-text-secondary hover:border-secondary-container hover:text-secondary'}`}
                    >
                      <GraduationCap size={24} />
                      <span className="text-xs font-black uppercase tracking-tighter">No Campus</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-outline-variant rounded-xl opacity-40">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Logística Desativada</p>
              </div>
            )}
          </div>

          <div className="bg-card-bg p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-secondary-container transition-colors">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xs font-bold text-secondary-container flex items-center gap-2 uppercase tracking-widest font-headline">
                <Users size={16} /> Detalhes Adicionais
               </h3>
               <button 
                 onClick={() => setShowAdvanced(!showAdvanced)}
                 className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${showAdvanced ? 'bg-secondary text-white border-secondary' : 'bg-surface-container text-text-secondary border-outline-variant'}`}
               >
                 {showAdvanced ? 'Habilitado' : 'Desabilitado'}
               </button>
             </div>

            {showAdvanced ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <button 
                    onClick={() => setFormData({...formData, convidado_externo: !formData.convidado_externo})}
                    className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all ${formData.convidado_externo ? 'border-secondary bg-secondary/5 text-secondary' : 'border-outline-variant text-text-secondary hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus size={18} />
                      <span className="text-xs font-bold">Convidado Externo</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.convidado_externo ? 'bg-secondary' : 'bg-outline-variant'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.convidado_externo ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  {formData.convidado_externo && (
                    <div className="space-y-1.5 text-text-secondary animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Nome do Palestrante</label>
                      <input 
                        type="text" 
                        value={formData.speaker}
                        onChange={(e) => setFormData({...formData, speaker: e.target.value})}
                        placeholder="Ex: Dr. João Silva"
                        className="w-full h-11 border border-outline-variant rounded-lg bg-card-bg px-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none text-text-primary" 
                      />
                    </div>
                  )}

                  <button 
                    onClick={() => setFormData({...formData, precisa_cabine: !formData.precisa_cabine})}
                    className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all ${formData.precisa_cabine ? 'border-secondary bg-secondary/5 text-secondary' : 'border-outline-variant text-text-secondary hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center gap-3">
                      <InfoIcon size={18} />
                      <span className="text-xs font-bold">Informações de Cabine</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.precisa_cabine ? 'bg-secondary' : 'bg-outline-variant'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.precisa_cabine ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  {formData.precisa_cabine && (
                    <div className="space-y-1.5 text-text-secondary animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[11px] font-bold uppercase tracking-wider block ml-1">Detalhes Técnicos</label>
                      <textarea 
                        value={formData.cabinInfo}
                        onChange={(e) => setFormData({...formData, cabinInfo: e.target.value})}
                        className="w-full border border-outline-variant rounded-lg bg-card-bg p-3 text-sm focus:ring-2 focus:ring-secondary-container outline-none resize-none h-20 text-text-primary" 
                        placeholder="Instruções para a equipe técnica da cabine..."
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-outline-variant rounded-xl opacity-40">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Detalhes Desativados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventForm;
