import { useState, useEffect } from 'react';
import { View, ActivityLog, User, Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  ChevronRight,
  X,
  ScrollText,
  UserCheck,
  GraduationCap,
  Filter,
  Search,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  CalendarX,
  CalendarClock,
  PenLine,
  Plus,
  Trash2
} from 'lucide-react';
import { getCourseStyle } from '../utils/index';

const ACTION_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string; border: string }> = {
  CANCEL_EVENT: { label: 'Cancelamento', icon: CalendarX, bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/25' },
  RESCHEDULE_EVENT: { label: 'Reagendamento', icon: CalendarClock, bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/25' },
  EDIT_EVENT: { label: 'Edição', icon: PenLine, bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/25' },
  CREATE_EVENT: { label: 'Criação', icon: Plus, bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/25' },
  CREATE_BATCH: { label: 'Lote Criado', icon: Plus, bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/25' },
  DELETE_EVENT: { label: 'Exclusão', icon: Trash2, bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/25' },
};

const ActionBadge = ({ action }: { action: string }) => {
  const cfg = ACTION_CONFIG[action];
  if (!cfg) return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg border bg-surface-container text-text-secondary border-outline-variant uppercase tracking-wider">{action?.replace(/_/g, ' ')}</span>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

const RoleBadge = ({ role }: { role?: string }) => {
  if (role === 'ADMIN') return <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 border border-orange-500/20 uppercase tracking-wider">Admin</span>;
  return <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/20 uppercase tracking-wider">Professor</span>;
};

const UserAvatar = ({ photoURL, displayName, size = 28 }: { photoURL?: string; displayName: string; size?: number }) => (
  <img
    src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&bold=true&size=${size * 2}`}
    className={`rounded-lg object-cover border border-outline-variant shrink-0`}
    style={{ width: size, height: size }}
    alt={displayName}
  />
);

const LogsView = () => {
  const { data: logs, loading: logsLoading } = useRealtimeCollection<ActivityLog>('activity_logs');
  const { data: users, loading: usersLoading } = useRealtimeCollection<User>('users');
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const { user } = useAuth();

  const [professorFilter, setProfessorFilter] = useState('Todos');
  const [courseFilter, setCourseFilter] = useState('Todos');
  const [actionFilter, setActionFilter] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'registros' | 'professor' | 'curso'>('registros');
  const [page, setPage] = useState(1);
  const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 50;

  const teachers = users.filter(u => u.role === 'PROFESSOR' || u.role === 'ADMIN');
  const courseList = courses;
  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredLogs = sortedLogs.filter(log => {
    if (professorFilter !== 'Todos' && log.userId !== professorFilter) return false;
    if (courseFilter !== 'Todos' && log.courseName !== courseFilter) return false;
    if (actionFilter !== 'Todas' && log.action !== actionFilter) return false;
    if (dateFilter !== 'Todos' && !log.createdAt.startsWith(dateFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (log.title?.toLowerCase().includes(q) || log.message?.toLowerCase().includes(q) || log.userName?.toLowerCase().includes(q) || log.courseName?.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [professorFilter, courseFilter, actionFilter, dateFilter, searchQuery]);

  const logsByProfessor = teachers.map(t => ({
    ...t,
    logs: filteredLogs.filter(l => l.userId === t.id || l.userName === t.displayName),
    count: filteredLogs.filter(l => l.userId === t.id || l.userName === t.displayName).length
  })).filter(g => g.count > 0).sort((a, b) => b.count - a.count);

  const uniqueCourses = [...new Set(filteredLogs.filter(l => l.courseName).map(l => l.courseName))];
  const logsByCourse = uniqueCourses.map(courseName => ({
    courseName: courseName!,
    logs: filteredLogs.filter(l => l.courseName === courseName),
    count: filteredLogs.filter(l => l.courseName === courseName).length
  })).filter(g => g.count > 0).sort((a, b) => b.count - a.count);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const resetFilters = () => {
    setProfessorFilter('Todos');
    setCourseFilter('Todos');
    setActionFilter('Todas');
    setDateFilter('Todos');
    setSearchQuery('');
  };

  const hasActiveFilters = professorFilter !== 'Todos' || courseFilter !== 'Todos' || actionFilter !== 'Todas' || dateFilter !== 'Todos' || searchQuery.trim() !== '';

  const noResults = filteredLogs.length === 0;

  if (logsLoading || usersLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-16">
        <div className="h-8 w-48 bg-surface-container rounded-lg animate-pulse mb-8" />
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 bg-card-bg rounded-xl border animate-pulse">
                <div className="h-4 bg-surface-container rounded-lg w-1/3 mb-2" />
                <div className="h-3 bg-surface-container rounded-lg w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span>EduEvent Pro</span>
            <ChevronRight size={14} />
            <span className="font-bold text-text-primary">Auditoria</span>
          </nav>
          <h1 className="text-3xl font-black font-headline text-text-primary">Painel de Auditoria</h1>
          <p className="text-sm text-text-secondary mt-1">Histórico completo de ações no sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-card-bg border border-outline-variant rounded-xl text-xs font-bold text-text-secondary flex items-center gap-2">
            <Activity size={14} className="text-secondary" />
            {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-outline-variant rounded-xl text-[10px] font-bold text-text-secondary hover:text-text-primary transition-all">
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-container/80 p-1.5 rounded-2xl flex gap-1 w-fit border border-outline-variant/50">
        {([
          { id: 'registros' as const, label: 'Registros', icon: ScrollText, count: filteredLogs.length },
          { id: 'professor' as const, label: 'Por Professor', icon: UserCheck, count: logsByProfessor.length },
          { id: 'curso' as const, label: 'Por Curso', icon: GraduationCap, count: logsByCourse.length },
        ]).map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive ? 'bg-card-bg text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TabIcon size={15} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-secondary/10 text-secondary' : 'bg-outline-variant/80 text-text-secondary'
                }`}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-card-bg border border-outline-variant p-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <Filter size={13} />
          </div>
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Professor</label>
            <select
              value={professorFilter}
              onChange={(e) => setProfessorFilter(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
            >
              <option value="Todos">Todos os Professores</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.displayName} ({t.role === 'ADMIN' ? 'Admin' : 'Professor'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Curso</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
            >
              <option value="Todos">Todos os Cursos</option>
              {courseList.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Ação</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
            >
              <option value="Todas">Todas as Ações</option>
              {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Período</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
            >
              <option value="Todos">Qualquer Período</option>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = d.toISOString().substring(0, 7);
                const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return <option key={val} value={val}>{label}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full bg-surface-container border border-outline-variant rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'registros' && (
          <motion.div
            key="registros-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-card-bg border border-outline-variant rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase text-text-primary tracking-wider">Registros de Auditoria</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Lista completa de todas as ações registradas.</p>
                </div>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-text-primary text-[11px] font-black rounded-xl border border-outline-variant">
                  <Activity size={12} className="text-secondary" />
                  {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {noResults ? (
                <div className="p-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-4 text-text-secondary">
                    <ScrollText size={22} />
                  </div>
                  <p className="text-sm font-bold text-text-secondary">Nenhum registro encontrado</p>
                  <p className="text-xs text-text-secondary opacity-60 mt-1">Ajuste os filtros para ver mais resultados.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container/40">
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Responsável</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Curso</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Ação</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Data / Hora</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {paginatedLogs.map((log, idx) => {
                          const userInfo = users.find(u => u.id === log.userId);
                          const displayName = log.userName || userInfo?.displayName || 'Sistema';
                          const photoURL = log.userPhotoURL || userInfo?.photoURL;
                          const role = log.userRole || userInfo?.role;
                          const courseStyle = getCourseStyle(log.courseName);

                          return (
                            <tr key={log.id} className="hover:bg-surface-container/30 transition-all group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar photoURL={photoURL} displayName={displayName} size={28} />
                                  <div>
                                    <p className="text-sm font-bold text-text-primary group-hover:text-secondary transition-colors">{displayName}</p>
                                    <RoleBadge role={role} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {log.courseName ? (
                                  <div className="flex items-center gap-1.5">
                                    <GraduationCap size={12} className="text-text-secondary" />
                                    <span className="text-xs font-bold text-text-primary">{log.courseName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-secondary italic">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <ActionBadge action={log.action} />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary">
                                  <Clock size={11} />
                                  <span className="font-mono">{formatDate(log.createdAt)}</span>
                                  <span className="text-text-secondary/50">·</span>
                                  <span className="font-mono">{formatTime(log.createdAt)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-xs">
                                  <p className="text-xs font-bold text-text-primary truncate">{log.title}</p>
                                  {log.message && (
                                    <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">{log.message}</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container/30">
                      <span className="text-[10px] font-bold text-text-secondary">
                        Página {page} de {totalPages} ({filteredLogs.length} registros)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-2 rounded-xl hover:bg-surface-container text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (page <= 4) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = page - 3 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 rounded-xl text-[11px] font-black transition-all ${
                                page === pageNum
                                  ? 'bg-secondary text-white shadow-sm'
                                  : 'text-text-secondary hover:bg-surface-container'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="p-2 rounded-xl hover:bg-surface-container text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'professor' && (
          <motion.div
            key="professor-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {logsByProfessor.length === 0 ? (
              <div className="bg-card-bg border border-outline-variant rounded-3xl p-16 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-4 text-text-secondary">
                  <UserCheck size={22} />
                </div>
                <p className="text-sm font-bold text-text-secondary">Nenhum professor com registros</p>
                <p className="text-xs text-text-secondary opacity-60 mt-1">Os logs aparecerão aqui agrupados por professor.</p>
              </div>
            ) : (
              logsByProfessor.map(t => {
                const isOpen = expandedProfessor === t.id;
                return (
                  <div key={t.id} className="bg-card-bg border border-outline-variant rounded-3xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedProfessor(isOpen ? null : t.id)}
                      className="w-full flex items-center gap-4 p-5 hover:bg-surface-container/30 transition-all text-left"
                    >
                      <UserAvatar photoURL={t.photoURL} displayName={t.displayName} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-text-primary">{t.displayName}</span>
                          <RoleBadge role={t.role} />
                        </div>
                        <p className="text-[10px] text-text-secondary font-mono mt-0.5">{t.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-secondary/10 text-secondary px-3 py-1.5 rounded-xl border border-secondary/20">
                          {t.count} aç{t.count === 1 ? 'ão' : 'ões'}
                        </span>
                        <ChevronDown size={16} className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-outline-variant/60 px-5 py-4 space-y-3 max-h-[500px] overflow-y-auto">
                            {t.logs.map(log => {
                              const cfg = ACTION_CONFIG[log.action];
                              const Icon = cfg?.icon || Activity;
                              return (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container/40 transition-all">
                                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${cfg?.bg || 'bg-surface-container'} ${cfg?.text || 'text-text-secondary'} ${cfg?.border || 'border-outline-variant'}`}>
                                    <Icon size={12} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-text-primary">{log.title}</span>
                                      {cfg && <ActionBadge action={log.action} />}
                                    </div>
                                    {log.message && <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">{log.message}</p>}
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <span className="text-[10px] font-bold text-text-secondary font-mono">
                                        <Clock size={10} className="inline mr-1" />
                                        {formatDate(log.createdAt)} · {formatTime(log.createdAt)}
                                      </span>
                                      {log.courseName && (
                                        <>
                                          <span className="w-0.5 h-3 bg-outline-variant rounded-full" />
                                          <span className="text-[10px] font-bold text-text-secondary">
                                            <GraduationCap size={10} className="inline mr-1" />
                                            {log.courseName}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'curso' && (
          <motion.div
            key="curso-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {logsByCourse.length === 0 ? (
              <div className="bg-card-bg border border-outline-variant rounded-3xl p-16 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-4 text-text-secondary">
                  <BookOpen size={22} />
                </div>
                <p className="text-sm font-bold text-text-secondary">Nenhum curso com registros</p>
                <p className="text-xs text-text-secondary opacity-60 mt-1">Os logs aparecerão aqui agrupados por curso.</p>
              </div>
            ) : (
              logsByCourse.map(g => {
                const isOpen = expandedCourse === g.courseName;
                const cs = getCourseStyle(g.courseName);
                const CourseIcon = cs.icon;
                return (
                  <div key={g.courseName} className="bg-card-bg border border-outline-variant rounded-3xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedCourse(isOpen ? null : g.courseName)}
                      className="w-full flex items-center gap-4 p-5 hover:bg-surface-container/30 transition-all text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cs.bg} ${cs.color} border ${cs.border}`}>
                        <CourseIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-text-primary">{g.courseName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-secondary/10 text-secondary px-3 py-1.5 rounded-xl border border-secondary/20">
                          {g.count} registro{g.count !== 1 ? 's' : ''}
                        </span>
                        <ChevronDown size={16} className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-outline-variant/60 px-5 py-4 space-y-3 max-h-[500px] overflow-y-auto">
                            {g.logs.map(log => {
                              const userInfo = users.find(u => u.id === log.userId);
                              const displayName = log.userName || userInfo?.displayName || 'Sistema';
                              const photoURL = log.userPhotoURL || userInfo?.photoURL;
                              const role = log.userRole || userInfo?.role;
                              const cfg = ACTION_CONFIG[log.action];
                              const Icon = cfg?.icon || Activity;
                              return (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container/40 transition-all">
                                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${cfg?.bg || 'bg-surface-container'} ${cfg?.text || 'text-text-secondary'} ${cfg?.border || 'border-outline-variant'}`}>
                                    <Icon size={12} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-text-primary">{log.title}</span>
                                      {cfg && <ActionBadge action={log.action} />}
                                    </div>
                                    {log.message && <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">{log.message}</p>}
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                                        <UserAvatar photoURL={photoURL} displayName={displayName} size={16} />
                                        <span className="text-text-primary">{displayName}</span>
                                        <RoleBadge role={role} />
                                      </div>
                                      <span className="w-0.5 h-3 bg-outline-variant rounded-full" />
                                      <span className="text-[10px] font-bold text-text-secondary font-mono">
                                        <Clock size={10} className="inline mr-1" />
                                        {formatDate(log.createdAt)} · {formatTime(log.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogsView;
