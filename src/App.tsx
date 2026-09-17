import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskStatus } from './types';
import { parseTasks, calculateStatus } from './lib/parser';
import { cn } from './lib/utils';
import { laden, speichern, pruefeRepoPrivat, clearConfig, ConflictError } from './lib/storage';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Import,
  Search,
  Filter,
  FolderPlus,
  WifiOff,
  Sparkles,
  HelpCircle,
  LogOut,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskNode } from './components/TaskNode';
import { CreateTaskModal } from './components/CreateTaskModal';
import { NetworkHelpModal } from './components/NetworkHelpModal';

function newId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const shaRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [conflict, setConflict] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [repoIsPrivate, setRepoIsPrivate] = useState<boolean | null>(null);
  const [checkingPrivate, setCheckingPrivate] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialType, setCreateModalInitialType] = useState<'category' | 'subcategory' | 'task'>('category');
  const [createModalInitialParentId, setCreateModalInitialParentId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNetworkHelpOpen, setIsNetworkHelpOpen] = useState(false);

  // Quick inputs & filters
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [newRootCategoryTitle, setNewRootCategoryTitle] = useState('');
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

  // Feedback & Drag-and-Drop
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Aufgaben aus dem privaten GitHub-Daten-Repo laden
  const fetchTasks = async () => {
    try {
      const { tasks: loaded, sha } = await laden();
      setTasks(loaded);
      shaRef.current = sha;
      setLoadError(null);
    } catch (error: any) {
      console.error('Laden fehlgeschlagen:', error);
      setLoadError(error.message || 'Laden fehlgeschlagen');
    }
  };

  const recheckPrivate = async () => {
    setCheckingPrivate(true);
    setRepoIsPrivate(await pruefeRepoPrivat());
    setCheckingPrivate(false);
  };

  useEffect(() => {
    fetchTasks();
    recheckPrivate();
  }, []);

  // Debounced Speichern: buendelt schnelle Aenderungen zu einem Commit
  // (ca. 2 Sekunden nach der letzten Aenderung), statt bei jedem Tastendruck
  // gegen die GitHub API zu schreiben.
  const scheduleSave = (nextTasks: Task[]) => {
    setTasks(nextTasks);
    setConflict(false);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const { sha } = await speichern(nextTasks, shaRef.current);
        shaRef.current = sha;
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
      } catch (error) {
        if (error instanceof ConflictError) {
          setConflict(true);
          setSaveStatus('error');
        } else {
          console.error('Speichern fehlgeschlagen:', error);
          setSaveStatus('error');
          showToast('Speichern fehlgeschlagen: ' + (error as Error).message, 'error');
        }
      }
    }, 2000);
  };

  const reloadAfterConflict = async () => {
    setConflict(false);
    setSaveStatus('idle');
    await fetchTasks();
  };

  const handleLogout = () => {
    clearConfig();
    window.location.reload();
  };

  // Build the task tree for hierarchical rendering
  const taskTree = useMemo(() => {
    const taskMap = new Map<string, Task>();
    const roots: Task[] = [];

    // First pass: create a map of all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, subtasks: [] });
    });

    // Second pass: build the tree
    taskMap.forEach(task => {
      if (task.parentId && taskMap.has(task.parentId)) {
        taskMap.get(task.parentId)!.subtasks.push(task);
      } else {
        roots.push(task);
      }
    });

    return roots;
  }, [tasks]);

  // Live parsed count for text import (declared at top level before early returns)
  const parsedLiveTasks = useMemo(() => {
    if (!importText.trim()) return [];
    return parseTasks(importText, 'admin');
  }, [importText]);

  const liveRootCount = parsedLiveTasks.filter(t => t.level === 0).length;
  const liveSubCount = parsedLiveTasks.filter(t => t.level > 0).length;

  // Graphical single task creation (instant, no server round-trip needed)
  const handleCreateTask = async (taskData: {
    title: string;
    parentId: string | null;
    type: 'category' | 'subcategory' | 'task';
    level: number;
    status: TaskStatus;
  }) => {
    const newTask: Task = {
      id: newId(),
      title: taskData.title,
      parentId: taskData.parentId,
      type: taskData.type,
      level: taskData.level,
      status: taskData.status,
      subtasks: [],
      userId: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    scheduleSave([...tasks, newTask]);
    if (taskData.parentId) {
      setExpandedTasks(prev => new Set(prev).add(taskData.parentId!));
    }
    showToast(
      taskData.type === 'category'
        ? `Hauptkategorie "${taskData.title}" erstellt`
        : `Aufgabe "${taskData.title}" erstellt`,
      'success'
    );
  };

  // Import files into a new category with tasks (0-typing)
  const handleImportFiles = async (files: FileList | File[], categoryName?: string) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const catTitle = categoryName?.trim() || '📁 Meine Dokumente & Dateien';
    const rootId = newId();
    const now = Date.now();

    const newCategory: Task = {
      id: rootId,
      title: catTitle,
      status: 'Upcoming',
      subtasks: [],
      parentId: null,
      userId: 'admin',
      createdAt: now,
      updatedAt: now,
      level: 0,
      type: 'category'
    };

    const fileTasks: Task[] = fileArray.map((file, idx) => ({
      id: newId(),
      title: file.name,
      status: 'Upcoming',
      subtasks: [],
      parentId: rootId,
      userId: 'admin',
      createdAt: now + idx + 1,
      updatedAt: now + idx + 1,
      level: 1,
      type: 'task'
    }));

    const batch = [newCategory, ...fileTasks];

    scheduleSave([...tasks, ...batch]);
    setExpandedTasks(prev => new Set(prev).add(rootId));
    showToast(`Hauptkategorie "${catTitle}" mit ${fileTasks.length} Dateien erstellt!`, 'success');
  };

  // Quick inline creation of root category
  const handleCreateRootCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRootCategoryTitle.trim() || isCreatingRoot) return;

    setIsCreatingRoot(true);
    try {
      await handleCreateTask({
        title: newRootCategoryTitle.trim(),
        parentId: null,
        type: 'category',
        level: 0,
        status: 'Upcoming'
      });
      setNewRootCategoryTitle('');
    } finally {
      setIsCreatingRoot(false);
    }
  };

  // Inline creation of subtask on a node
  const handleAddInlineSubtask = async (parentId: string, parentType: 'category' | 'subcategory' | 'task', title: string) => {
    const parent = tasks.find(t => t.id === parentId);
    const childType = parentType === 'category' ? 'subcategory' : 'task';
    const level = parent ? parent.level + 1 : 1;

    await handleCreateTask({
      title,
      parentId,
      type: childType,
      level,
      status: 'Upcoming'
    });
  };

  // Inline renaming
  const handleUpdateTaskTitle = async (taskId: string, newTitle: string) => {
    scheduleSave(tasks.map(t => t.id === taskId ? { ...t, title: newTitle, updatedAt: Date.now() } : t));
  };

  // Direct status update: nach unten auf alle Unteraufgaben durchreichen,
  // nach oben auf Eltern-Kategorien neu berechnen - alles auf einem einzigen
  // Arbeits-Snapshot, dann ein einziges Speichern.
  const handleSetStatus = async (task: Task, newStatus: TaskStatus) => {
    const byId = new Map<string, Task>(tasks.map(t => [t.id, { ...t }]));

    const setStatusRec = (id: string, status: TaskStatus) => {
      const node = byId.get(id);
      if (!node) return;
      node.status = status;
      node.updatedAt = Date.now();
      byId.forEach(child => {
        if (child.parentId === id) setStatusRec(child.id, status);
      });
    };
    setStatusRec(task.id, newStatus);

    // Nach oben propagieren, solange sich der Status der Eltern-Kategorie aendert
    let currentParentId = task.parentId;
    while (currentParentId) {
      const parentTask = byId.get(currentParentId);
      if (!parentTask) break;

      const siblings = Array.from(byId.values()).filter(t => t.parentId === currentParentId);
      const newParentStatus = calculateStatus(siblings);

      if (newParentStatus !== parentTask.status) {
        parentTask.status = newParentStatus;
        parentTask.updatedAt = Date.now();
        currentParentId = parentTask.parentId;
      } else {
        break;
      }
    }

    scheduleSave(Array.from(byId.values()));
  };

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'Done' ? 'Upcoming' : 'Done';
    await handleSetStatus(task, nextStatus);
  };

  // Loescht die Aufgabe samt aller Unteraufgaben in beliebiger Tiefe (frueher
  // eine rekursive SQL-CTE, hier eine Fixpunkt-Suche ueber das flache Array).
  const deleteTask = async (taskId: string) => {
    const toDelete = new Set<string>([taskId]);
    let added = true;
    while (added) {
      added = false;
      for (const t of tasks) {
        if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) {
          toDelete.add(t.id);
          added = true;
        }
      }
    }
    scheduleSave(tasks.filter(t => !toDelete.has(t.id)));
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTasks(newExpanded);
  };

  // Text import handler
  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const newTasks = parseTasks(importText, 'admin');
      if (newTasks.length === 0) {
        setImportError('Keine Aufgaben im eingegebenen Text erkannt. Bitte prüfe deinen Text oder wähle eine fertige Vorlage.');
        setIsImporting(false);
        return;
      }

      scheduleSave([...tasks, ...newTasks]);
      const rootCatCount = newTasks.filter(t => t.level === 0).length;
      showToast(`${newTasks.length} Elemente (${rootCatCount} Hauptkategorien) importiert!`, 'success');
      setIsImportModalOpen(false);
      setImportText('');
    } catch (err) {
      console.error('Import failed:', err);
      showToast('Fehler beim Import.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // 1-Click ready template loader (No typing required at all!)
  const handleApplyTemplate = async (templateType: 'uni' | 'project' | 'weekly') => {
    let templateText = '';
    if (templateType === 'uni') {
      templateText = `1. Vorlesungen & Module
• Informatik 1
+ Vorlesungs-Folien durchgehen
++ Kapitel 1 & 2 zusammenfassen
+ Übungsblatt 03 bearbeiten
• Höhere Mathematik
+ Tutoriums-Aufgaben nachrechnen
2. Prüfungsphase & Klausuren
• Prüfungsanmeldung
+ Fristen im Prüfungsportal prüfen
• Lerngruppe organisieren
+ Termin für Altklausuren festlegen`;
    } else if (templateType === 'project') {
      templateText = `1. Produktentwicklung
• Benutzeroberfläche
+ Grafische Aufgabenerstellung bauen
++ Klickbare Status-Buttons integrieren
• Backend & API
+ Server-Endpunkte absichern
2. Launch & Präsentation
• Vorbereitung
+ Präsentations-Folien fertigstellen`;
    } else {
      templateText = `1. Wochenfokus
• Wichtige Meilensteine
+ Top-3 Prioritäten erledigen
+ E-Mails beantworten
2. Wochenabschluss
• Nachbereitung
+ Nächste Woche planen`;
    }

    const parsed = parseTasks(templateText, 'admin');
    scheduleSave([...tasks, ...parsed]);
  };

  // Count stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Drag and drop handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleImportFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-gray-50/60 pb-24 text-gray-900 relative"
    >
      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-3 max-w-sm border border-blue-100">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <FolderPlus className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Dateien hier loslassen</h3>
              <p className="text-xs text-gray-600">
                Es wird sofort eine Hauptkategorie mit deinen Dateien als Aufgabenliste erstellt.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border backdrop-blur-md transition-all",
              toast.type === 'success' 
                ? "bg-gray-900/95 text-white border-gray-800 shadow-gray-900/20" 
                : "bg-red-600 text-white border-red-500 shadow-red-600/20"
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <HelpCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-gray-900 tracking-tight leading-none">
                Management der Aufgaben für den Ausbau der sozialpädagogischen Lernplattform
              </h1>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Hierarchische Aufgaben grafisch verwalten
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speicher-Status */}
            {saveStatus !== 'idle' && (
              <span className={cn(
                "hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg",
                saveStatus === 'saving' && "text-gray-500 bg-gray-100",
                saveStatus === 'saved' && "text-emerald-700 bg-emerald-50",
                saveStatus === 'error' && "text-red-700 bg-red-50"
              )}>
                {saveStatus === 'saving' && 'Speichert…'}
                {saveStatus === 'saved' && 'Gespeichert'}
                {saveStatus === 'error' && 'Fehler beim Speichern'}
              </span>
            )}

            {/* Abmelden Button */}
            <button
              onClick={handleLogout}
              title="Abmelden (Token wird lokal gelöscht)"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200/80 rounded-xl transition-all border border-gray-200/60"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="hidden md:inline">Abmelden</span>
            </button>

            {/* Uni-WLAN Hinweis Button */}
            <button
              onClick={() => setIsNetworkHelpOpen(true)}
              title="Hinweise & Lösungen für eduroam / Uni-WLAN"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100/80 rounded-xl transition-all border border-amber-200/60"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline">Uni-WLAN Hilfe</span>
            </button>

            {/* Optionaler Text-Import Button */}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              title="Aufgaben per Text/Gliederung importieren"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-xl transition-all border border-gray-200/90 shadow-sm"
            >
              <Import className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">Text-Import</span>
            </button>

            {/* Primärer grafischer Button: "+ Neue Aufgabe / Kategorie" */}
            <button 
              onClick={() => {
                setCreateModalInitialType('category');
                setCreateModalInitialParentId(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              <span>Aufgabe erstellen</span>
            </button>
          </div>
        </div>
      </header>

      {/* Warnbanner: Konflikt, unprivates Repo, Ladefehler */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-4 space-y-2">
        {conflict && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
              Die Liste wurde inzwischen von jemand anderem geändert — bitte neu laden.
            </div>
            <button
              onClick={reloadAfterConflict}
              className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors"
            >
              Jetzt neu laden
            </button>
          </div>
        )}

        {repoIsPrivate === false && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              Das Daten-Repository ist NICHT privat! Jeder im Internet kann eure Aufgaben sehen. Bitte in den Repository-Einstellungen auf "Private" umstellen.
            </div>
            <button
              onClick={recheckPrivate}
              disabled={checkingPrivate}
              className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {checkingPrivate ? 'Prüft…' : 'Erneut prüfen'}
            </button>
          </div>
        )}

        {loadError && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              Laden fehlgeschlagen: {loadError}
            </div>
            <button
              onClick={fetchTasks}
              className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 mt-6">
        {/* Progress & Overview Bar */}
        {totalTasks > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/70 p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Fortschritt</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-gray-900">{completionPercentage}%</span>
                  <span className="text-xs text-gray-400 font-medium">
                    ({completedTasks} von {totalTasks} erledigt)
                  </span>
                </div>
              </div>
              <div className="hidden sm:block h-8 w-px bg-gray-200" />
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">In Arbeit</span>
                  <span className="font-semibold text-amber-700">{inProgressTasks}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Offen</span>
                  <span className="font-semibold text-gray-700">{totalTasks - completedTasks - inProgressTasks}</span>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full sm:w-64 bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Filter & Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Aufgaben durchsuchen..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200/90 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Status Filter Tabs & Quick Action */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-200/70 p-1 rounded-2xl">
              {(['All', 'Upcoming', 'In Progress', 'Done'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-xl transition-all",
                    statusFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {f === 'All' ? 'Alle' : f === 'Upcoming' ? 'Offen' : f === 'In Progress' ? 'In Arbeit' : 'Erledigt'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCreateModalInitialType('category');
                setCreateModalInitialParentId(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Kategorie</span>
            </button>
          </div>
        </div>

        {/* Tree Container */}
        <div className="space-y-1.5">
          {taskTree.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border-2 border-dashed border-gray-200/90">
              <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Noch keine Aufgaben vorhanden</h3>
              <p className="text-gray-500 text-xs max-w-md mx-auto mt-1 mb-6">
                Erstelle jetzt direkt grafisch deine erste Kategorie oder lade mit einem Klick ein fertiges Beispiel.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button 
                  onClick={() => {
                    setCreateModalInitialType('category');
                    setCreateModalInitialParentId(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Grafisch Kategorie erstellen
                </button>

                <button 
                  onClick={() => handleApplyTemplate('uni')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Uni-Beispiel laden (1-Klick)
                </button>
              </div>
            </div>
          ) : (
            <>
              {taskTree
                .filter(root => {
                  const matchesSearch = root.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesFilter = statusFilter === 'All' || root.status === statusFilter;
                  return matchesSearch && matchesFilter;
                })
                .map(root => (
                  <TaskNode 
                    key={root.id} 
                    task={root} 
                    expandedTasks={expandedTasks}
                    toggleExpand={toggleExpand}
                    toggleStatus={toggleTaskStatus}
                    onDelete={deleteTask}
                    onAddSubtask={handleAddInlineSubtask}
                    onUpdateTitle={handleUpdateTaskTitle}
                    onSetStatus={handleSetStatus}
                  />
                ))}

              {/* Inline Quick-Add Row at the bottom of the list for new root categories */}
              <form 
                onSubmit={handleCreateRootCategory}
                className="mt-6 p-2.5 bg-white/80 hover:bg-white rounded-2xl border border-dashed border-gray-300 hover:border-blue-400 transition-all flex items-center gap-2 shadow-xs"
              >
                <div className="p-2 text-gray-400">
                  <FolderPlus className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={newRootCategoryTitle}
                  onChange={(e) => setNewRootCategoryTitle(e.target.value)}
                  placeholder="Neue Hauptkategorie direkt erstellen (z.B. Semester 2, Projekt B)..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-gray-800 outline-none placeholder:text-gray-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!newRootCategoryTitle.trim() || isCreatingRoot}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kategorie anlegen</span>
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Graphical Task / Category Creation Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tasks={tasks}
        initialType={createModalInitialType}
        initialParentId={createModalInitialParentId}
        onSave={handleCreateTask}
        onApplyTemplate={handleApplyTemplate}
        onImportFiles={handleImportFiles}
      />

      {/* University Wi-Fi Help Modal */}
      <NetworkHelpModal
        isOpen={isNetworkHelpOpen}
        onClose={() => setIsNetworkHelpOpen(false)}
      />

      {/* Text Import Modal with Live Preview & File-Selection */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Text- & Datei-Import</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Erstellt sofort Hauptkategorien und Aufgaben</p>
                  </div>
                  <button 
                    onClick={() => setIsImportModalOpen(false)} 
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                {importError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {importError}
                  </div>
                )}
                
                <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl mb-4 text-xs text-blue-900 flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <p className="font-bold mb-1">Flexibles Format (automatisch erkannt):</p>
                    <pre className="font-mono text-[11px] opacity-90">
                      1. Meine Vorlesungen{"\n"}
                      • Mathe I{"\n"}
                      + Übungsblatt 1{"\n"}
                      ++ Teilaufgabe A
                    </pre>
                  </div>

                  <div className="border-t sm:border-t-0 sm:border-l sm:pl-4 border-blue-200/60 flex flex-col justify-center">
                    <label className="cursor-pointer bg-white hover:bg-blue-100/50 text-blue-800 border border-blue-200 px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-xs">
                      <FolderPlus className="w-4 h-4 text-blue-600" />
                      <span>Dateien auswählen</span>
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleImportFiles(e.target.files);
                            setIsImportModalOpen(false);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-blue-700 mt-1">oder Dokumente direkt hier ablegen</span>
                  </div>
                </div>

                {/* Live Erkennungs-Status */}
                {importText.trim() && (
                  <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Live-Erkennung: <strong>{liveRootCount} Hauptkategorie(n)</strong> und <strong>{liveSubCount} Unteraufgabe(n)</strong> erkannt!
                    </span>
                  </div>
                )}

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Füge hier deinen Text oder Dateinamen ein (z.B. Semester 1, Vorlesung 1, Übungsblatt...)"
                  className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs resize-none"
                />

                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-5 py-2.5 text-gray-600 text-xs font-semibold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button 
                    onClick={handleImport}
                    disabled={!importText.trim() || isImporting}
                    className="px-7 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200 flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Wird importiert...
                      </>
                    ) : 'Jetzt erstellen'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
