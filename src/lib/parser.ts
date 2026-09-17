import { Task, TaskStatus } from '../types';

/**
 * Parses any text string into a flat array of tasks with parent references.
 * Highly tolerant and supports:
 * - Numbered lists: "1. ", "1) ", "1 - " (Root category, level 0)
 * - Markdown headers: "# " (level 0), "## " (level 1), "### " (level 2)
 * - Hierarchy bullets: "• " (level 1), "+ " (level 2), "++ " (level 3)
 * - Standard markdown bullets: "- ", "* ", "+ " (level based on indent)
 * - Indentation (spaces / tabs)
 * - Plain lists of files or items (automatically mapped so nothing is lost)
 */
export function parseTasks(text: string, userId: string): Task[] {
  const rawLines = text.split('\n');
  const tasks: Task[] = [];
  const stack: { id: string; level: number }[] = [];

  // Filter out empty lines but keep track of raw lines with indentation
  const nonEmptyLines: { raw: string; trimmed: string; indent: number }[] = [];
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Calculate indentation: 1 tab = 4 spaces
    const leadingWhitespace = raw.match(/^\s*/)?.[0] || '';
    const spaceCount = leadingWhitespace.replace(/\t/g, '    ').length;
    nonEmptyLines.push({ raw, trimmed, indent: spaceCount });
  }

  if (nonEmptyLines.length === 0) return [];

  // Detect if any explicit hierarchy markers exist in the whole text
  const hasNumberedRoots = nonEmptyLines.some(l => /^\d+[\.\)\-]\s/.test(l.trimmed));
  const hasMarkdownHeaders = nonEmptyLines.some(l => /^#{1,4}\s/.test(l.trimmed));
  const hasCustomBullets = nonEmptyLines.some(l => l.trimmed.startsWith('• ') || l.trimmed.startsWith('+ '));
  const hasIndents = nonEmptyLines.some(l => l.indent >= 2);

  nonEmptyLines.forEach((item, index) => {
    const { trimmed, indent } = item;
    let level = -1;
    let title = trimmed;
    let initialStatus: TaskStatus = 'Upcoming';

    // Status prefix detection: [x] or [X] -> Done, [/] or [~] -> In Progress
    if (/^\[x\]\s*/i.test(title)) {
      initialStatus = 'Done';
      title = title.replace(/^\[x\]\s*/i, '');
    } else if (/^\[[\/~]\]\s*/.test(title)) {
      initialStatus = 'In Progress';
      title = title.replace(/^\[[\/~]\]\s*/, '');
    } else if (/^\[\s*\]\s*/.test(title)) {
      initialStatus = 'Upcoming';
      title = title.replace(/^\[\s*\]\s*/, '');
    }

    // 1. Markdown Headers: # Category, ## Subcategory, ### Task
    if (/^#{1,6}\s/.test(title)) {
      const match = title.match(/^(#{1,6})\s/);
      if (match) {
        level = match[1].length - 1; // # is 0, ## is 1, ### is 2
        title = title.replace(/^#{1,6}\s+/, '');
      }
    }
    // 2. Numbered root items: "1. ", "1) ", "1 - "
    else if (/^\d+[\.\)\-]\s*/.test(title)) {
      // Check for hierarchical numbering like "1.1 " or "1.2.3 "
      const hierMatch = title.match(/^(\d+(\.\d+)+)[\.\)\-]?\s*/);
      if (hierMatch) {
        const dotCount = (hierMatch[1].match(/\./g) || []).length;
        level = dotCount; // 1.1 is level 1, 1.1.1 is level 2
        title = title.replace(/^(\d+(\.\d+)+)[\.\)\-]?\s*/, '');
      } else {
        level = 0;
        title = title.replace(/^\d+[\.\)\-]\s*/, '');
      }
    }
    // 3. Bullets: "• "
    else if (title.startsWith('• ') || title.startsWith('•\t')) {
      level = 1;
      title = title.replace(/^•\s*/, '');
    }
    // 4. Plus hierarchy: "+ ", "++ ", "+++ "
    else if (title.startsWith('+')) {
      const match = title.match(/^(\++)/);
      if (match) {
        const plusCount = match[1].length;
        level = plusCount + 1; // + is level 2, ++ is level 3
        title = title.replace(/^\++\s*/, '');
      }
    }
    // 5. Standard bullet items: "- ", "* "
    else if (/^[\-\*]\s/.test(title)) {
      title = title.replace(/^[\-\*]\s*/, '');
      if (hasIndents && indent >= 2) {
        level = Math.min(Math.floor(indent / 2), 4);
      } else {
        level = 1;
      }
    }
    // 6. Indentation based (if lines are indented with spaces/tabs)
    else if (hasIndents && indent >= 2) {
      level = Math.min(Math.floor(indent / 2), 4);
    }
    // 7. Plain text fallback:
    // If no markers at all in the document, treat the very first line as category (level 0),
    // and subsequent lines as tasks (level 2) or subcategories (level 1).
    else {
      if (!hasNumberedRoots && !hasMarkdownHeaders && !hasCustomBullets) {
        if (index === 0) {
          level = 0; // First line is main category
        } else {
          level = 1; // Following lines are items
        }
      } else {
        // In a structured document, an unmarked line follows the current parent
        level = stack.length > 0 ? stack[stack.length - 1].level + 1 : 0;
      }
    }

    if (level < 0) level = 0;
    if (!title.trim()) return;

    let type: 'category' | 'subcategory' | 'task' = 'task';
    if (level === 0) type = 'category';
    else if (level === 1) type = 'subcategory';
    else type = 'task';

    // Find parent in stack
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;
    const id = 'task_parsed_' + index + '_' + Math.random().toString(36).substring(2, 9);

    const task: Task = {
      id,
      title: title.trim(),
      status: initialStatus,
      subtasks: [],
      parentId,
      userId,
      createdAt: Date.now() + index,
      updatedAt: Date.now() + index,
      level,
      type
    };

    tasks.push(task);
    stack.push({ id, level });
  });

  return tasks;
}

/**
 * Calculates the status of a task based on its subtasks.
 * - 0 subtasks: Keep current status
 * - All subtasks Done: "Done"
 * - All subtasks Upcoming: "Upcoming"
 * - Otherwise: "In Progress"
 */
export function calculateStatus(subtasks: Task[]): TaskStatus {
  if (subtasks.length === 0) return 'Upcoming';

  const allDone = subtasks.every(s => s.status === 'Done');
  const allUpcoming = subtasks.every(s => s.status === 'Upcoming');

  if (allDone) return 'Done';
  if (allUpcoming) return 'Upcoming';
  return 'In Progress';
}
