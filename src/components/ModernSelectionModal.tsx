import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: { id: string; label: string; sublabel?: string }[];
  onSelect: (id: string, label: string) => void;
  placeholder?: string;
  icon?: any;
}

export const ModernSelectionModal = ({
  isOpen, onClose, title, items, onSelect, placeholder = "Pesquisar...", icon: Icon = Search,
}: ModalProps) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(search.toLowerCase()) ||
    (i.sublabel && i.sublabel.toLowerCase().includes(search.toLowerCase()))
  );
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-card-bg w-full max-w-md rounded-3xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
          <h2 className="text-lg font-bold text-text-primary uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors text-text-secondary">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 border-b border-outline-variant">
          <div className="relative">
            <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              autoFocus type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full h-11 pl-10 pr-4 bg-surface-container border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-secondary outline-none text-text-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map(item => (
            <button key={item.id} onClick={() => { onSelect(item.id, item.label); onClose(); }}
              className="w-full flex flex-col items-start px-4 py-3 hover:bg-secondary/10 rounded-xl transition-all group border border-transparent hover:border-secondary/20"
            >
              <span className="text-sm font-bold text-text-primary group-hover:text-secondary transition-colors">{item.label}</span>
              {item.sublabel && <span className="text-[10px] text-text-secondary font-medium italic">{item.sublabel}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-text-secondary italic text-sm">Nenhum resultado encontrado para "{search}"</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
