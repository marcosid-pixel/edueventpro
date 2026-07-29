import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  Settings,
  ChevronDown,
  X,
  Info,
  Calendar,
  Clock,
  CheckCircle2,
  KeyRound,
  Mail,
  Trash2
} from 'lucide-react';
import { User as UserIcon, AlertCircle as AlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { parseJsonArray, calculateTotalHours, getEventHours } from '../utils/index';
import { ACADEMIC_COURSES, EVENT_CATEGORIES } from '../constants';
import type { View, AcademicEvent, User, Course, ActivityLog } from '../types';

const UserManagementView = () => {
  const { effectiveRole } = useAuth();
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'COORDENADOR';
  const { data: users } = useRealtimeCollection<User>('users');
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const { data: events, refresh: refreshEvents } = useRealtimeCollection<AcademicEvent>('events');
  const { data: activityLogs } = useRealtimeCollection<ActivityLog>('activity_logs');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const handleUpdateUserField = async (userId: string, field: string, value: any) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    } catch (err) { console.error(err); }
  };

  const handleSendResetLink = async (userId: string, userName: string) => {
    if (!confirm(`Enviar um e-mail com link de redefinição de senha para ${userName}?`)) return;
    
    try {
      toast.loading("Enviando e-mail...", { id: 'reset' });
      const res = await fetch('/api/auth/send-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error, { id: 'reset' });
      } else {
        toast.success(`E-mail enviado para ${userName} com sucesso!`, { id: 'reset' });
      }
    } catch (err) {
      toast.error('Erro de conexão.', { id: 'reset' });
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Excluir a aula "${eventTitle}"?`)) return;
    try {
      await fetch(`/api/events_delete/${eventId}`, { method: 'POST' });
      toast.success('Aula excluída com sucesso!');
      refreshEvents();
    } catch (err) { toast.error('Erro ao excluir aula'); }
  };

  const logs = [...activityLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span>Configurações</span>
            <ChevronRight size={14} />
            <span className="font-bold text-text-primary">Governança de Usuários</span>
          </nav>
          <h1 className="text-3xl font-black font-headline text-text-primary">Equipe & Docentes</h1>
          <p className="text-sm text-text-secondary">Monitore a performance e carga horária individual de cada colaborador.</p>
        </div>
        <div className="flex items-center gap-3 bg-card-bg p-2 rounded-2xl border border-outline-variant shadow-sm">
           <div className="px-4 py-1 text-center border-r border-outline-variant">
              <p className="text-[10px] font-black text-text-secondary uppercase">Total Equipe</p>
              <p className="text-xl font-black text-secondary">{users.length}</p>
           </div>
           <div className="px-4 py-1 text-center">
              <p className="text-[10px] font-black text-text-secondary uppercase">Horas Totais</p>
              <p className="text-xl font-black text-secondary">{Number.isInteger(calculateTotalHours(events)) ? calculateTotalHours(events) : calculateTotalHours(events).toFixed(1)}</p>
           </div>
        </div>
      </div>

      {/* Árvore de Responsabilidade — só para ADMIN */}
      {isAdmin && users.filter(u => u.role === 'COORDENADOR').length > 0 && (
        <div className="bg-card-bg rounded-3xl border border-outline-variant p-6 shadow-sm">
          <h3 className="text-xs font-black text-text-primary mb-4 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Árvore de Responsabilidade
          </h3>
          <div className="space-y-3">
            {users.filter(u => u.role === 'COORDENADOR').map(coord => {
              const vinculados = users.filter(u => u.createdBy === coord.id);
              return (
                <div key={coord.id} className="pl-2">
                  <p className="text-xs font-bold text-text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                    {coord.displayName}
                    <span className="text-[10px] font-medium text-text-secondary bg-surface-container px-1.5 py-0.5 rounded">
                      {vinculados.length} professor{vinculados.length !== 1 ? 'es' : ''}
                    </span>
                  </p>
                  {vinculados.length === 0 ? (
                    <p className="text-[11px] text-text-secondary italic ml-4 mt-0.5">
                      Nenhum professor vinculado
                    </p>
                  ) : (
                    <ul className="ml-4 mt-1 space-y-0.5">
                      {vinculados.map(p => (
                        <li key={p.id} className="text-[11px] text-text-secondary flex items-center gap-1.5">
                          <span className="text-text-tertiary">→</span> {p.displayName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {users.map(u => {
          const userEvents = events.filter(e => e.teacher === u.displayName || e.createdBy === u.id);
          const isExpanded = expandedUserId === u.id;
          
          const teacherLogs = logs.filter(log => {
            const ev = events.find(e => e.id === log.eventId);
            return (ev && ev.teacher === u.displayName) || log.userName === u.displayName;
          });
          
          const currentMonthStr = new Date().toISOString().substring(0, 7);
          
          const absences = teacherLogs.filter(log => log.action === 'CANCEL_EVENT');
          const absencesTotal = absences.length;
          const absencesMonth = absences.filter(log => log.createdAt.startsWith(currentMonthStr)).length;
          
          const changes = teacherLogs.filter(log => log.action === 'RESCHEDULE_EVENT' || log.action === 'EDIT_EVENT');
          const changesTotal = changes.length;
          const changesMonth = changes.filter(log => log.createdAt.startsWith(currentMonthStr)).length;

          return (
            <div 
              key={u.id} 
              className={`bg-card-bg rounded-3xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-secondary shadow-xl ring-1 ring-secondary/20' : 'border-outline-variant hover:border-secondary/30 shadow-sm'
              }`}
            >
              <div 
                onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img 
                      src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random&color=fff&bold=true`} 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-outline-variant group-hover:border-secondary transition-colors" 
                      alt={u.displayName} 
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card-bg flex items-center justify-center ${u.role === 'ADMIN' ? 'bg-orange-500' : u.role === 'COORDENADOR' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                       {u.role === 'ADMIN' ? <Settings size={10} className="text-white" /> : <UserIcon size={10} className="text-white" />}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-primary group-hover:text-secondary transition-colors">{u.displayName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-black uppercase bg-surface-container px-2 py-0.5 rounded border border-outline-variant ${
                        u.role === 'ADMIN' ? 'text-orange-600' : u.role === 'COORDENADOR' ? 'text-purple-600' : 'text-text-secondary'
                      }`}>
                        {u.role === 'ADMIN' ? 'Administrador' : u.role === 'COORDENADOR' ? 'Coordenador(a)' : 'Professor(a)'}
                      </span>
                      <span className="text-xs text-text-secondary font-medium italic">{u.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 flex-wrap">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Carga Horária</p>
                    <p className="text-2xl font-black text-text-primary">{Number.isInteger(calculateTotalHours(userEvents)) ? calculateTotalHours(userEvents) : calculateTotalHours(userEvents).toFixed(1)} <span className="text-xs font-bold text-text-secondary">hrs</span></p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Faltas</p>
                    <p className="text-2xl font-black text-red-500">{absencesTotal} <span className="text-xs font-bold text-text-secondary">({absencesMonth} mÊs)</span></p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Mudanças</p>
                    <p className="text-2xl font-black text-amber-500">{changesTotal} <span className="text-xs font-bold text-text-secondary">({changesMonth} mÊs)</span></p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Aulas Ativas</p>
                    <p className="text-2xl font-black text-secondary">{userEvents.filter(e => e.status !== 'Completed' && e.status !== 'Cancelled').length}</p>
                  </div>
                  <div className={`p-3 rounded-2xl transition-all ${isExpanded ? 'bg-secondary text-white rotate-180' : 'bg-surface-container text-text-secondary group-hover:bg-secondary/10 group-hover:text-secondary'}`}>
                     <ChevronDown size={20} />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-outline-variant bg-surface-container/30"
                  >
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                             <Settings size={14} /> Definições de Acesso
                          </h4>
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Cargo / Função</label>
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  u.role === 'ADMIN' ? 'bg-orange-500/10' : u.role === 'COORDENADOR' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                                }`}>
                                  {u.role === 'ADMIN' ? <Settings size={14} className="text-orange-500" /> : u.role === 'COORDENADOR' ? <UserIcon size={14} className="text-purple-500" /> : <UserIcon size={14} className="text-blue-500" />}
                                </div>
                                <select
                                  value={u.role || 'PROFESSOR'}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    handleUpdateUserField(u.id, 'role', e.target.value);
                                    toast.success(`Cargo alterado para ${e.target.value}`);
                                  }}
                                  className="flex-1 bg-card-bg border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary"
                                >
                                  <option value="PROFESSOR">Professor(a)</option>
                                  <option value="COORDENADOR">Coordenador(a)</option>
                                  <option value="ADMIN">Administrador</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Departamentos Designados</label>
                              <div className="flex flex-wrap gap-1.5 p-2 bg-card-bg border border-outline-variant rounded-xl min-h-[44px]">
                                {parseJsonArray(u.courseId).map(deptId => {
                                  const deptName = deptId.startsWith('auto_') ? deptId.replace('auto_', '') : (courses.find(c => c.id === deptId)?.name || deptId);
                                  return (
                                    <span key={deptId} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold rounded-lg">
                                      {deptName}
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const current = parseJsonArray(u.courseId);
                                          const updated = current.filter(id => id !== deptId);
                                          handleUpdateUserField(u.id, 'courseId', JSON.stringify(updated));
                                        }}
                                        className="hover:text-red-500 transition-colors"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                                {parseJsonArray(u.courseId).length === 0 && (
                                  <span className="text-[11px] text-text-secondary italic self-center ml-2">Nenhum departamento</span>
                                )}
                              </div>
                              <select
                                value=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  const current = parseJsonArray(u.courseId);
                                  if (!current.includes(val)) {
                                    const updated = [...current, val];
                                    handleUpdateUserField(u.id, 'courseId', JSON.stringify(updated));
                                  }
                                  e.target.value = "";
                                }}
                                className="w-full bg-card-bg border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary mt-1"
                              >
                                <option value="">+ Vincular Departamento...</option>
                                {ACADEMIC_COURSES.map(courseName => {
                                  const courseId = `auto_${courseName}`;
                                  const isSelected = parseJsonArray(u.courseId).includes(courseId);
                                  if (isSelected) return null;
                                  return <option key={courseName} value={courseId}>{courseName}</option>;
                                })}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Áreas / Modalidades</label>
                              <div className="flex flex-wrap gap-1.5 p-2 bg-card-bg border border-outline-variant rounded-xl min-h-[44px]">
                                {parseJsonArray(u.category).map(cat => (
                                  <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[11px] font-bold rounded-lg">
                                    {cat}
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const current = parseJsonArray(u.category);
                                        const updated = current.filter(c => c !== cat);
                                        handleUpdateUserField(u.id, 'category', JSON.stringify(updated));
                                      }}
                                      className="hover:text-red-500 transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                                {parseJsonArray(u.category).length === 0 && (
                                  <span className="text-[11px] text-text-secondary italic self-center ml-2">Geral / Todas</span>
                                )}
                              </div>
                              <select
                                value=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  const current = parseJsonArray(u.category);
                                  if (!current.includes(val)) {
                                    const updated = [...current, val];
                                    handleUpdateUserField(u.id, 'category', JSON.stringify(updated));
                                  }
                                  e.target.value = "";
                                }}
                                className="w-full bg-card-bg border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary mt-1"
                              >
                                <option value="">+ Vincular Área...</option>
                                {EVENT_CATEGORIES.map(cat => {
                                  const isSelected = parseJsonArray(u.category).includes(cat);
                                  if (isSelected) return null;
                                  return <option key={cat} value={cat}>{cat}</option>;
                                })}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-2xl">
                           <div className="flex items-center gap-3 text-secondary mb-2">
                              <Info size={16} />
                              <span className="text-[10px] font-black uppercase">Resumo Semestral</span>
                           </div>
                           <p className="text-xs text-text-secondary leading-relaxed">
                             Este docente é responsável por <span className="font-bold text-text-primary">{userEvents.length} eventos</span>. 
                              A taxa de aulas confirmadas está em <span className="font-bold text-text-primary">{Math.round((userEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled').length / (userEvents.length || 1)) * 100)}%</span>.
                           </p>
                        </div>

                        <div className="pt-2">
                           <button 
                             onClick={() => handleSendResetLink(u.id, u.displayName)}
                             className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black transition-colors"
                           >
                             <Mail size={14} /> ENVIAR LINK PARA REDEFINIR SENHA
                           </button>
                        </div>
                      </div>

                      <div className="lg:col-span-8 space-y-6">
                        {u.pending_delete && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3 text-red-700">
                              <AlertIcon size={20} />
                              <div>
                                <p className="text-xs font-black uppercase">Solicitação de Exclusão</p>
                                <p className="text-[10px] font-medium">Este usuário solicitou a remoção permanente da conta.</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={async () => {
                                   if (confirm(`TEM CERTEZA? Isso apagará permanentemente o usuário ${u.displayName} e todos os seus dados.`)) {
                                     await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
                                     toast("Usuário excluído com sucesso.");
                                   }
                                 }}
                                 className="px-4 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl hover:bg-red-700 transition-colors"
                               >
                                 APROVAR EXCLUSÃO
                               </button>
                               <button 
                                 onClick={() => handleUpdateUserField(u.id, 'pending_delete', false)}
                                 className="px-4 py-2 bg-surface-container text-text-primary text-[10px] font-black rounded-xl hover:bg-outline-variant transition-colors"
                               >
                                 REJEITAR
                               </button>
                            </div>
                          </div>
                        )}

                        <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-4">
                           <Calendar size={14} /> Cronograma de Atividades
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-3">
                              <div className="flex items-center justify-between px-2">
                                 <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Próximas Aulas (Pendentes)</span>
                                 <span className="text-[9px] font-bold text-text-secondary">{userEvents.filter(e => e.status === 'Scheduled').length}</span>
                              </div>
                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                                  {userEvents.filter(e => e.status === 'Scheduled').map(ev => (
                                    <div key={ev.id} className="p-3 bg-card-bg border border-outline-variant rounded-2xl flex items-center justify-between group/ev">
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                             <Clock size={14} />
                                          </div>
                                          <div>
                                             <p className="text-[11px] font-black text-text-primary line-clamp-1">{ev.title}</p>
                                             <p className="text-[9px] text-text-secondary font-medium">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-2">
                                         {isAdmin && (
                                           <button
                                             onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id, ev.title); }}
                                             className="opacity-0 group-hover/ev:opacity-100 p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                             title="Excluir aula"
                                           >
                                             <Trash2 size={12} />
                                           </button>
                                         )}
                                         <div className="w-2 h-2 rounded-full bg-orange-400" />
                                       </div>
                                    </div>
                                  ))}
                                 {userEvents.filter(e => e.status === 'Scheduled').length === 0 && (
                                   <div className="p-8 text-center border-2 border-dashed border-outline-variant rounded-2xl text-[10px] text-text-secondary italic">
                                     Nenhuma aula pendente.
                                   </div>
                                 )}
                              </div>
                           </div>

                           <div className="space-y-3">
                              <div className="flex items-center justify-between px-2">
                                 <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Histórico / Confirmadas</span>
                                  <span className="text-[9px] font-bold text-text-secondary">{userEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled' || e.status === 'Completed').length}</span>
                              </div>
                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                                  {userEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled' || e.status === 'Completed').map(ev => (
                                   <div key={ev.id} className="p-3 bg-card-bg border border-outline-variant rounded-2xl flex items-center justify-between group/ev">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={14} />
                                         </div>
                                         <div>
                                            <p className="text-[11px] font-black text-text-primary line-clamp-1">{ev.title}</p>
                                            <p className="text-[9px] text-text-secondary font-medium">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isAdmin && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id, ev.title); }}
                                            className="opacity-0 group-hover/ev:opacity-100 p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Excluir aula"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                      </div>
                                   </div>
                                 ))}
                                  {userEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled' || e.status === 'Completed').length === 0 && (
                                   <div className="p-8 text-center border-2 border-dashed border-outline-variant rounded-2xl text-[10px] text-text-secondary italic">
                                     Nenhuma aula concluída.
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        </div>

      </div>
    );
  };

export default UserManagementView;
