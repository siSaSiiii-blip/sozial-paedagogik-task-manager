import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, FolderPlus, ListPlus, CheckSquare, Sparkles, UploadCloud, FileText } from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  initialParentId?: string | null;
  initialType?: 'category' | 'subcategory' | 'task';
  onSave: (taskData: {
    title: string;
    parentId: string | null;
    type: 'category' | 'subcategory' | 'task';
    level: number;
    status: TaskStatus;
  }) => Promise<void>;
  onApplyTemplate?: (templateType: 'uni' | 'project' | 'weekly') => Promise<void>;
  onImportFiles?: (files: FileList | File[], categoryName: string) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  tasks,
  initialParentId = null,
  initialType = 'category',
  onSave,
  onApplyTemplate,
  onImportFiles
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'category' | 'subcategory' | 'task'>(initialType);
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [status, setStatus] = useState<TaskStatus>('Upcoming');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categorySuggestions = [
    '📁 Meine Dateien & Skripte',
    '📚 Vorlesungen & Module',
    '📝 Hausarbeiten & Essays',
    '🎯 Prüfungsvorbereitung',
    '🔬 Übungen & Tutorien'
  ];

  const subcategorySuggestions = [
    '📂 Skripte & Folien',
    '📂 Hausaufgaben',
    '📂 Mitschriften',
    '📂 Prüfungsthemen'
  ];

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setType(initialType);
      setParentId(initialParentId);
      setStatus('Upcoming');
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialParentId, initialType]);

  // When type is category, parentId must be null
  const handleTypeChange = (newType: 'category' | 'subcategory' | 'task') => {
    setType(newType);
    setErrorMessage(null);
    if (newType === 'category') {
      setParentId(null);
    } else if (!parentId && tasks.length > 0) {
      if (newType === 'subcategory') {
        const firstCat = tasks.find(t => t.type === 'category');
        setParentId(firstCat ? firstCat.id : tasks[0].id);
      } else {
        const firstSub = tasks.find(t => t.type === 'subcategory') || tasks[0];
        setParentId(firstSub.id);
      }
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportFiles) {
      setIsSubmitting(true);
      try {
        const catTitle = title.trim() || '📁 Meine Dokumente & Dateien';
        await onImportFiles(e.target.files, catTitle);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Fehler beim Dateien-Import');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let level = 0;
      if (type === 'category') {
        level = 0;
      } else if (parentId) {
        const parent = tasks.find(t => t.id === parentId);
        level = parent ? parent.level + 1 : 1;
      } else {
        level = type === 'subcategory' ? 1 : 2;
      }

      await onSave({
        title: title.trim(),
        parentId: type === 'category' ? null : parentId,
        type,
        level,
        status
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setErrorMessage(err.message || 'Fehler beim Erstellen. Bitte prüfe die Verbindung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col"
        >
          <div className="p-6 md:p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-md shadow-blue-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Grafisch erstellen</h2>
                  <p className="text-xs text-gray-500">Ohne Formatierungsregeln direkt als Element</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Grafischer Typ-Wähler */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  1. Was möchtest du erstellen?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('category')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      type === 'category'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm ring-2 ring-blue-500/20 font-bold'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
                    }`}
                  >
                    <FolderPlus className={`w-5 h-5 mb-1.5 ${type === 'category' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-xs">Hauptkategorie</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Oberste Ebene</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('subcategory')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      type === 'subcategory'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm ring-2 ring-blue-500/20 font-bold'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
                    }`}
                  >
                    <ListPlus className={`w-5 h-5 mb-1.5 ${type === 'subcategory' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-xs">Unterkategorie</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Ordner / Fach</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('task')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      type === 'task'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm ring-2 ring-blue-500/20 font-bold'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
                    }`}
                  >
                    <CheckSquare className={`w-5 h-5 mb-1.5 ${type === 'task' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-xs">Aufgabe / Datei</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Check-Element</span>
                  </button>
                </div>
              </div>

              {/* Titel-Eingabe & Schnellauswahl */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  2. Name / Titel eingeben
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    type === 'category'
                      ? "z.B. Semester 1, Vorlesungen, Klausurphase..."
                      : type === 'subcategory'
                      ? "z.B. Mathematik I, Informatik, Skripte..."
                      : "z.B. Übungsblatt 1 lösen, Folien durcharbeiten..."
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800 shadow-xs"
                  autoFocus
                />

                {/* 1-Klick Schnell-Vorschläge */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(type === 'category' ? categorySuggestions : subcategorySuggestions).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setTitle(sugg)}
                      className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-lg transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Übergeordnetes Element wählen (falls nicht Hauptkategorie) */}
              {type !== 'category' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    3. Übergeordneter Kategorie zuordnen
                  </label>
                  {tasks.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Es existieren noch keine Hauptkategorien. Wähle oben bitte "Hauptkategorie", um die erste zu erstellen.
                    </p>
                  ) : (
                    <select
                      value={parentId || ''}
                      onChange={(e) => setParentId(e.target.value || null)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-gray-800"
                    >
                      {tasks
                        .filter(t => (type === 'subcategory' ? t.type === 'category' : true))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.type === 'category' ? '📁 ' : t.type === 'subcategory' ? '  📂 ' : '    • '}
                            {t.title}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {/* Status-Auswahl */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Anfangs-Status
                </label>
                <div className="flex gap-2">
                  {(['Upcoming', 'In Progress', 'Done'] as const).map((s) => {
                    const isSelected = status === s;
                    const labels = {
                      Upcoming: '⚪ Bevorstehend',
                      'In Progress': '🟡 In Bearbeitung',
                      Done: '🟢 Erledigt'
                    };
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                          isSelected
                            ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Datei-Upload Dropzone */}
              {onImportFiles && (
                <div className="pt-2 border-t border-gray-100">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-2xl p-3 text-center transition-all group"
                  >
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                      <UploadCloud className="w-4 h-4 text-blue-500" />
                      <span>Dateien hochladen / auswählen (z.B. PDF, Word, Skripte)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Erstellt automatisch eine Hauptkategorie mit deinen Dateien als Aufgabenliste
                    </p>
                  </div>
                </div>
              )}

              {/* Fertige Vorlagen (Optional, für 1-Klick Start) */}
              {onApplyTemplate && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showTemplates ? 'Vorlagen ausblenden' : 'Oder: Fertige Uni-Vorlage laden (ohne Tippen)'}
                  </button>

                  {showTemplates && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate('uni');
                          onClose();
                        }}
                        className="p-2.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border border-blue-200 rounded-xl text-left transition-all"
                      >
                        <span className="text-xs font-bold block">🎓 Uni & Studium</span>
                        <span className="text-[10px] text-blue-700 block mt-0.5">Vorlesungen & Klausuren</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate('project');
                          onClose();
                        }}
                        className="p-2.5 bg-purple-50/70 hover:bg-purple-100/70 text-purple-900 border border-purple-200 rounded-xl text-left transition-all"
                      >
                        <span className="text-xs font-bold block">🚀 Projekt-Launch</span>
                        <span className="text-[10px] text-purple-700 block mt-0.5">Meilensteine & Tasks</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate('weekly');
                          onClose();
                        }}
                        className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900 border border-emerald-200 rounded-xl text-left transition-all"
                      >
                        <span className="text-xs font-bold block">📋 Wochenplan</span>
                        <span className="text-[10px] text-emerald-700 block mt-0.5">Tagesaufgaben</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isSubmitting}
                  className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Erstellen
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
