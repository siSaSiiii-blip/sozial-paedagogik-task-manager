import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { cn } from '../lib/utils';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CornerDownRight
} from 'lucide-react';

interface TaskNodeProps {
  task: Task;
  expandedTasks: Set<string>;
  toggleExpand: (id: string) => void;
  toggleStatus: (task: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddSubtask: (parentId: string, parentType: 'category' | 'subcategory' | 'task', title: string) => Promise<void>;
  onUpdateTitle: (taskId: string, newTitle: string) => Promise<void>;
  onSetStatus: (task: Task, newStatus: TaskStatus) => Promise<void>;
  depth?: number;
}

export const TaskNode: React.FC<TaskNodeProps> = ({
  task,
  expandedTasks,
  toggleExpand,
  toggleStatus,
  onDelete,
  onAddSubtask,
  onUpdateTitle,
  onSetStatus,
  depth = 0
}) => {
  const isExpanded = expandedTasks.has(task.id);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // Inline subtask addition state
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false);

  // Inline title editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  // Status popover state
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const statusColors = {
    Upcoming: 'bg-gray-100 text-gray-600 border-gray-200',
    'In Progress': 'bg-amber-100 text-amber-800 border-amber-300',
    Done: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };

  const statusLabels = {
    Upcoming: 'Bevorstehend',
    'In Progress': 'In Bearbeitung',
    Done: 'Erledigt'
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle.trim() === task.title) {
      setIsEditing(false);
      setEditTitle(task.title);
      return;
    }
    await onUpdateTitle(task.id, editTitle.trim());
    setIsEditing(false);
  };

  const handleCreateInlineSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subtaskTitle.trim() || isSubmittingSubtask) return;

    setIsSubmittingSubtask(true);
    try {
      // If this is a category, subtask is subcategory. Otherwise it's a task.
      const childType = task.type === 'category' ? 'subcategory' : 'task';
      await onAddSubtask(task.id, childType, subtaskTitle.trim());
      setSubtaskTitle('');
      setIsAddingSubtask(false);
      if (!isExpanded) {
        toggleExpand(task.id);
      }
    } finally {
      setIsSubmittingSubtask(false);
    }
  };

  return (
    <div className="group relative">
      <div
        className={cn(
          "flex items-center gap-2.5 py-2.5 px-3 rounded-2xl transition-all cursor-default group/item relative",
          task.type === 'category' && "mt-5 mb-1.5 bg-white shadow-sm border border-gray-200/80 py-3.5 px-5 font-bold",
          task.type === 'subcategory' && "mt-1.5 mb-1 font-semibold text-gray-800 bg-gray-50/70 border border-gray-100/80 px-3.5 py-2",
          task.type === 'task' && "hover:bg-gray-100/70 text-gray-700 py-1.5"
        )}
        style={{ marginLeft: task.type === 'category' ? 0 : `${Math.min(depth, 5) * 20}px` }}
      >
        {/* Left Side: Collapse Arrow, Status Checkbox, Title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Collapse icon */}
          {hasSubtasks ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(task.id);
              }}
              title={isExpanded ? "Zuklappen" : "Aufklappen"}
              className="p-1 hover:bg-gray-200/70 rounded-lg transition-colors text-gray-400 hover:text-gray-700 shrink-0"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 shrink-0 flex items-center justify-center">
              {depth > 0 && <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
            </div>
          )}

          {/* Status Checkbox */}
          <button
            onClick={() => toggleStatus(task)}
            title={`Status: ${statusLabels[task.status]} (Klicken zum Umschalten)`}
            className="flex-shrink-0 transition-transform active:scale-90 p-0.5 rounded-lg hover:bg-gray-100"
          >
            {task.status === 'Done' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : task.status === 'In Progress' ? (
              <Clock className="w-5 h-5 text-amber-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
            )}
          </button>

          {/* Title or Inline Edit Input */}
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditTitle(task.title);
                  }
                }}
                className="px-2.5 py-1 text-sm bg-white border border-blue-500 rounded-lg outline-none flex-1 ring-2 ring-blue-100"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                title="Speichern"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(task.title);
                }}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded-md"
                title="Abbrechen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span
              onDoubleClick={() => setIsEditing(true)}
              className={cn(
                "truncate text-sm select-none cursor-pointer",
                task.type === 'category' ? "text-base font-bold text-gray-900" : "text-gray-700",
                task.type === 'subcategory' && "text-sm font-semibold text-gray-800",
                task.status === 'Done' && "text-gray-400 line-through decoration-gray-300"
              )}
            >
              {task.title}
            </span>
          )}
        </div>

        {/* Right Side: Graphische Schnellaktionen (Buttons) */}
        {!isEditing && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status Badge mit Klick-Wähler */}
            <div className="relative">
              <button
                onClick={() => setShowStatusPicker(!showStatusPicker)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer",
                  statusColors[task.status]
                )}
                title="Klicken, um Status auszuwählen"
              >
                {statusLabels[task.status]}
              </button>

              {showStatusPicker && (
                <div className="absolute right-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-36 text-xs animate-in fade-in">
                  {(['Upcoming', 'In Progress', 'Done'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        onSetStatus(task, st);
                        setShowStatusPicker(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors",
                        task.status === st && "font-bold text-blue-600 bg-blue-50/50"
                      )}
                    >
                      {st === 'Done' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : st === 'In Progress' ? (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      {statusLabels[st]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grafischer Button: "+ Unteraufgabe" */}
            <button
              onClick={() => {
                setIsAddingSubtask(true);
                if (!isExpanded && hasSubtasks) toggleExpand(task.id);
              }}
              title="Grafisch Unteraufgabe hier hinzufügen"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unteraufgabe</span>
            </button>

            {/* Rename Button */}
            <button
              onClick={() => setIsEditing(true)}
              title="Titel bearbeiten"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button */}
            <button
              onClick={() => onDelete(task.id)}
              title="Aufgabe löschen"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Inline Subtask Creation Input (Notion style) */}
      {isAddingSubtask && (
        <div
          className="flex items-center gap-2 my-1.5 p-2 bg-blue-50/60 rounded-2xl border border-blue-200/80 animate-in fade-in slide-in-from-top-1"
          style={{ marginLeft: `${(depth + 1) * 20}px` }}
        >
          <CornerDownRight className="w-4 h-4 text-blue-500 shrink-0 ml-1" />
          <input
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateInlineSubtask();
              if (e.key === 'Escape') {
                setIsAddingSubtask(false);
                setSubtaskTitle('');
              }
            }}
            placeholder={`Neue Unteraufgabe für "${task.title}"...`}
            className="flex-1 px-3 py-1.5 text-sm bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
          <button
            onClick={() => handleCreateInlineSubtask()}
            disabled={!subtaskTitle.trim() || isSubmittingSubtask}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            Hinzufügen
          </button>
          <button
            onClick={() => {
              setIsAddingSubtask(false);
              setSubtaskTitle('');
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subtasks Tree Recursion */}
      {isExpanded && hasSubtasks && (
        <div className="overflow-hidden">
          {task.subtasks.map((sub) => (
            <TaskNode
              key={sub.id}
              task={sub}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              toggleStatus={toggleStatus}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onUpdateTitle={onUpdateTitle}
              onSetStatus={onSetStatus}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
