/**
 * EO Reflection System
 *
 * Non-intrusive three-phase reflection pattern:
 *   1. What just happened? (Grounding, safety, trust)
 *   2. What does it mean? (Interpretation, ambiguity, alternatives)
 *   3. What do you want to do next? (Agency, intent, direction)
 *
 * In EO terms: INS/SEG → DES/ALT → SYN/REC
 *
 * Implementation patterns:
 *   - Expandable toasts (progressive disclosure)
 *   - Inline reflection cards (in-context)
 *   - Reflection queue (deferred review)
 *   - Context bar (recent action with undo)
 *   - Ambient indicators (visual changes in data)
 */

// ============================================================================
// Constants
// ============================================================================

const REFLECTION_TYPES = Object.freeze({
  IMPORT: 'import',
  CREATE_COLUMN: 'create_column',
  FILTER: 'filter',
  SAVE_LENS: 'save_lens',
  MERGE_RECORDS: 'merge_records',
  RESOLVE_CONFLICT: 'resolve_conflict',
  PIVOT: 'pivot',
  EXPORT: 'export',
  CREATE_SET: 'create_set',
  DELETE_RECORD: 'delete_record'
});

const REFLECTION_PRIORITY = Object.freeze({
  IMMEDIATE: 'immediate',    // Show right away (expandable toast)
  CONTEXTUAL: 'contextual',  // Show in context (inline card)
  DEFERRED: 'deferred'       // Queue for later review
});

// ============================================================================
// Reflection Configuration
// ============================================================================

/**
 * Configuration for each reflection type
 * Defines the three-phase questions and actions for each action type
 */
const REFLECTION_CONFIGS = {
  [REFLECTION_TYPES.IMPORT]: {
    priority: REFLECTION_PRIORITY.IMMEDIATE,
    phases: {
      happened: {
        template: (ctx) => `${ctx.recordCount} records imported from ${ctx.sourceName}`,
        icon: 'ph-upload',
        details: (ctx) => [
          `Source type: ${ctx.sourceType || 'CSV'}`,
          `Columns detected: ${ctx.columnCount}`,
          ctx.warnings?.length ? `${ctx.warnings.length} warnings` : null
        ].filter(Boolean)
      },
      meaning: {
        template: () => 'How should this data be interpreted?',
        questions: (ctx) => {
          const questions = [];
          if (ctx.ambiguousColumns?.length) {
            questions.push({
              type: 'column_interpretation',
              label: 'Some columns need interpretation',
              columns: ctx.ambiguousColumns
            });
          }
          if (ctx.dateColumns?.length) {
            questions.push({
              type: 'date_format',
              label: 'Date format detection',
              columns: ctx.dateColumns
            });
          }
          return questions;
        }
      },
      next: {
        actions: [
          { id: 'apply_suggestions', label: 'Apply Suggestions', primary: true },
          { id: 'review_later', label: 'Review Later' },
          { id: 'skip', label: 'Skip' }
        ]
      }
    },
    canUndo: false
  },

  [REFLECTION_TYPES.CREATE_COLUMN]: {
    priority: REFLECTION_PRIORITY.CONTEXTUAL,
    phases: {
      happened: {
        template: (ctx) => `Created ${ctx.columnType === 'derived' ? 'derived' : 'new'} field "${ctx.columnName}"`,
        icon: 'ph-plus-circle',
        details: (ctx) => ctx.columnType === 'derived' ? [
          `Formula: ${ctx.formula || 'Custom calculation'}`,
          `Depends on: ${ctx.dependencies?.join(', ') || 'None'}`
        ] : null
      },
      meaning: {
        template: () => 'What does this field represent?',
        questions: () => [{
          type: 'definition_binding',
          label: 'Bind to a definition (optional)'
        }, {
          type: 'field_type',
          label: 'Is this an estimate, inference, or declaration?',
          options: ['estimate', 'inferred', 'declared', 'unknown']
        }]
      },
      next: {
        actions: [
          { id: 'bind_definition', label: 'Bind Definition', primary: true },
          { id: 'mark_type', label: 'Set Type' },
          { id: 'dismiss', label: 'Dismiss' }
        ]
      }
    },
    canUndo: true
  },

  [REFLECTION_TYPES.FILTER]: {
    priority: REFLECTION_PRIORITY.CONTEXTUAL,
    phases: {
      happened: {
        template: (ctx) => `Showing ${ctx.filteredCount} of ${ctx.totalCount} records`,
        icon: 'ph-funnel',
        details: (ctx) => [
          `Filter: ${ctx.filterDescription}`
        ]
      },
      meaning: {
        template: () => 'Is this a working slice or a meaningful category?',
        options: [
          { id: 'temporary', label: 'Just exploring', icon: 'ph-magnifying-glass' },
          { id: 'meaningful', label: 'This represents a concept', icon: 'ph-bookmark' }
        ]
      },
      next: {
        actions: [
          { id: 'save_lens', label: 'Save as Lens', primary: true },
          { id: 'keep_temporary', label: 'Keep Exploring' },
          { id: 'clear_filter', label: 'Clear Filter' }
        ]
      }
    },
    canUndo: true
  },

  [REFLECTION_TYPES.SAVE_LENS]: {
    priority: REFLECTION_PRIORITY.DEFERRED,
    phases: {
      happened: {
        template: (ctx) => `Lens "${ctx.lensName}" created`,
        icon: 'ph-eye',
        details: (ctx) => [
          `Based on: ${ctx.sourceSet}`,
          `Filter: ${ctx.filterDescription || 'None'}`,
          `Records: ${ctx.recordCount}`
        ]
      },
      meaning: {
        template: () => 'What concept does this Lens represent?',
        questions: () => [{
          type: 'lens_purpose',
          label: 'Consider binding to a definition'
        }]
      },
      next: {
        actions: [
          { id: 'bind_definition', label: 'Bind Definition' },
          { id: 'add_description', label: 'Add Description' },
          { id: 'done', label: 'Done', primary: true }
        ]
      }
    },
    canUndo: true
  },

  [REFLECTION_TYPES.MERGE_RECORDS]: {
    priority: REFLECTION_PRIORITY.IMMEDIATE,
    phases: {
      happened: {
        template: (ctx) => `${ctx.recordCount} records merged`,
        icon: 'ph-git-merge',
        details: () => [
          'Nothing was deleted',
          'All values preserved',
          'Lineage recorded'
        ]
      },
      meaning: {
        template: () => 'In what sense are these the same?',
        options: [
          { id: 'same_person', label: 'Same person', icon: 'ph-user' },
          { id: 'same_household', label: 'Same household', icon: 'ph-house' },
          { id: 'same_org', label: 'Same organization', icon: 'ph-buildings' },
          { id: 'uncertain', label: 'Uncertain', icon: 'ph-question' }
        ]
      },
      next: {
        actions: [
          { id: 'keep_all', label: 'Keep All Values', primary: true },
          { id: 'prefer_recent', label: 'Prefer Most Recent' },
          { id: 'choose_manually', label: 'Choose Manually' }
        ]
      }
    },
    canUndo: true
  },

  [REFLECTION_TYPES.RESOLVE_CONFLICT]: {
    priority: REFLECTION_PRIORITY.CONTEXTUAL,
    phases: {
      happened: {
        template: (ctx) => `${ctx.valueCount} values exist for "${ctx.fieldName}"`,
        icon: 'ph-git-branch',
        details: (ctx) => ctx.values?.map(v => `${v.value} (from ${v.source})`) || []
      },
      meaning: {
        template: () => 'Why are they different?',
        explanation: (ctx) => ctx.explanation || 'Different sources may have different perspectives'
      },
      next: {
        actions: [
          { id: 'keep_all', label: 'Keep All (Superposition)', primary: true },
          { id: 'resolve_rule', label: 'Resolve by Rule' },
          { id: 'choose_one', label: 'Choose One' }
        ]
      }
    },
    canUndo: true
  },

  [REFLECTION_TYPES.PIVOT]: {
    priority: REFLECTION_PRIORITY.IMMEDIATE,
    phases: {
      happened: {
        template: (ctx) => `Data now organized around ${ctx.pivotField}`,
        icon: 'ph-arrows-clockwise',
        details: () => [
          'Same data',
          'Same sources',
          'New center of identity'
        ]
      },
      meaning: {
        template: () => 'What changed vs stayed the same?',
        explanation: () => 'The data is identical, only the perspective changed'
      },
      next: {
        actions: [
          { id: 'save_view', label: 'Save This View', primary: true },
          { id: 'compare', label: 'Compare Views' },
          { id: 'switch_back', label: 'Switch Back' }
        ]
      }
    },
    canUndo: true
  },

  [REFLECTION_TYPES.EXPORT]: {
    priority: REFLECTION_PRIORITY.IMMEDIATE,
    phases: {
      happened: {
        template: (ctx) => `Exporting ${ctx.recordCount} records`,
        icon: 'ph-export',
        details: (ctx) => [
          `Format: ${ctx.format || 'CSV'}`,
          `From: ${ctx.sourceSet}`
        ]
      },
      meaning: {
        template: () => 'What meaning should travel with this data?',
        questions: () => [{
          type: 'export_context',
          label: 'Include semantic context?',
          options: [
            { id: 'uris', label: 'Include semantic URIs' },
            { id: 'labels', label: 'Flatten to labels only' },
            { id: 'preserve', label: 'Preserve multi-values' }
          ]
        }]
      },
      next: {
        actions: [
          { id: 'export_full', label: 'Export with Context', primary: true },
          { id: 'export_simple', label: 'Export Simple' },
          { id: 'cancel', label: 'Cancel' }
        ]
      }
    },
    canUndo: false
  }
};

// ============================================================================
// Reflection Store
// ============================================================================

/**
 * Stores pending reflections for deferred review
 */
class ReflectionStore {
  constructor() {
    this.pending = [];
    this.completed = [];
    this.dismissed = [];
    this._listeners = new Set();
    this._storageKey = 'eo_reflection_queue';
    this._load();
  }

  _load() {
    try {
      const stored = localStorage.getItem(this._storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.pending = data.pending || [];
        // Clean up old items (older than 7 days)
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.pending = this.pending.filter(r => r.timestamp > cutoff);
      }
    } catch (e) {
      console.warn('Failed to load reflection queue:', e);
    }
  }

  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify({
        pending: this.pending
      }));
    } catch (e) {
      console.warn('Failed to save reflection queue:', e);
    }
  }

  add(reflection) {
    const item = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...reflection
    };
    this.pending.unshift(item);
    this._save();
    this._notify();
    return item;
  }

  complete(id, outcome) {
    const index = this.pending.findIndex(r => r.id === id);
    if (index !== -1) {
      const [item] = this.pending.splice(index, 1);
      item.completedAt = Date.now();
      item.outcome = outcome;
      this.completed.push(item);
      this._save();
      this._notify();
    }
  }

  dismiss(id) {
    const index = this.pending.findIndex(r => r.id === id);
    if (index !== -1) {
      const [item] = this.pending.splice(index, 1);
      item.dismissedAt = Date.now();
      this.dismissed.push(item);
      this._save();
      this._notify();
    }
  }

  dismissAll() {
    const now = Date.now();
    this.pending.forEach(item => {
      item.dismissedAt = now;
      this.dismissed.push(item);
    });
    this.pending = [];
    this._save();
    this._notify();
  }

  getPending() {
    return [...this.pending];
  }

  getPendingCount() {
    return this.pending.length;
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify() {
    this._listeners.forEach(cb => {
      try { cb(this.pending); } catch (e) { console.error(e); }
    });
  }
}

// ============================================================================
// Expandable Toast
// ============================================================================

/**
 * Extended toast that supports progressive disclosure
 * Phase 1: Compact summary
 * Phase 2: Expanded details with reflection questions
 * Phase 3: Action buttons
 */
class ExpandableToast {
  constructor(options) {
    this.type = options.type;
    this.context = options.context || {};
    this.config = REFLECTION_CONFIGS[this.type];
    this.onAction = options.onAction || (() => {});
    this.element = null;
    this.expanded = false;
    this.store = options.store;
  }

  show() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    this.element = document.createElement('div');
    this.element.className = 'toast expandable-toast success';
    this._render();
    container.appendChild(this.element);

    // Auto-dismiss after 8 seconds if not interacted with
    this._dismissTimer = setTimeout(() => {
      if (!this.expanded && this.element?.parentElement) {
        this._dismiss();
      }
    }, 8000);

    return this;
  }

  _render() {
    const { phases } = this.config;
    const happened = phases.happened;
    const icon = happened.icon || 'ph-info';
    const message = typeof happened.template === 'function'
      ? happened.template(this.context)
      : happened.template;

    const details = typeof happened.details === 'function'
      ? happened.details(this.context)
      : happened.details;

    this.element.innerHTML = `
      <i class="ph ${icon} toast-icon"></i>
      <div class="toast-content">
        <span class="toast-message">${this._escapeHtml(message)}</span>
        ${!this.expanded ? `
          <button class="toast-expand-btn" title="Show details">
            <i class="ph ph-caret-down"></i> Details
          </button>
        ` : ''}
      </div>
      ${this.expanded ? this._renderExpanded(details) : ''}
      <button class="toast-close"><i class="ph ph-x"></i></button>
    `;

    this._bindEvents();
  }

  _renderExpanded(details) {
    const { phases } = this.config;
    const meaning = phases.meaning;
    const next = phases.next;

    let detailsHtml = '';
    if (details?.length) {
      detailsHtml = `
        <div class="toast-details">
          ${details.map(d => `<div class="toast-detail-item">${this._escapeHtml(d)}</div>`).join('')}
        </div>
      `;
    }

    let meaningHtml = '';
    const meaningQuestion = typeof meaning.template === 'function'
      ? meaning.template(this.context)
      : meaning.template;

    if (meaning.options) {
      const options = typeof meaning.options === 'function'
        ? meaning.options(this.context)
        : meaning.options;
      meaningHtml = `
        <div class="toast-meaning">
          <div class="toast-meaning-question">${this._escapeHtml(meaningQuestion)}</div>
          <div class="toast-meaning-options">
            ${options.map(opt => `
              <button class="toast-meaning-option" data-option-id="${opt.id}">
                ${opt.icon ? `<i class="ph ${opt.icon}"></i>` : ''}
                ${this._escapeHtml(opt.label)}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (meaning.explanation) {
      const explanation = typeof meaning.explanation === 'function'
        ? meaning.explanation(this.context)
        : meaning.explanation;
      meaningHtml = `
        <div class="toast-meaning">
          <div class="toast-meaning-question">${this._escapeHtml(meaningQuestion)}</div>
          <div class="toast-meaning-explanation">${this._escapeHtml(explanation)}</div>
        </div>
      `;
    }

    let actionsHtml = '';
    if (next?.actions) {
      actionsHtml = `
        <div class="toast-actions-expanded">
          ${next.actions.map(action => `
            <button class="toast-action-btn${action.primary ? ' primary' : ''}" data-action-id="${action.id}">
              ${this._escapeHtml(action.label)}
            </button>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="toast-expanded-content">
        ${detailsHtml}
        ${meaningHtml}
        ${actionsHtml}
      </div>
    `;
  }

  _bindEvents() {
    // Expand button
    const expandBtn = this.element.querySelector('.toast-expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.expand();
      });
    }

    // Close button
    const closeBtn = this.element.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._dismiss();
      });
    }

    // Meaning options
    this.element.querySelectorAll('.toast-meaning-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const optionId = btn.dataset.optionId;
        // Visual feedback
        this.element.querySelectorAll('.toast-meaning-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.context.selectedMeaning = optionId;
      });
    });

    // Action buttons
    this.element.querySelectorAll('.toast-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionId = btn.dataset.actionId;
        this.onAction(actionId, this.context);
        this._dismiss();
      });
    });
  }

  expand() {
    if (this.expanded) return;
    this.expanded = true;
    clearTimeout(this._dismissTimer);
    this.element.classList.add('expanded');
    this._render();
  }

  _dismiss() {
    if (!this.element) return;
    this.element.classList.add('toast-out');
    setTimeout(() => {
      this.element?.remove();
      this.element = null;
    }, 300);
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// Inline Reflection Card
// ============================================================================

/**
 * In-context reflection card that appears where the action happened
 */
class ReflectionCard {
  constructor(options) {
    this.type = options.type;
    this.context = options.context || {};
    this.config = REFLECTION_CONFIGS[this.type];
    this.anchor = options.anchor; // DOM element to anchor near
    this.onAction = options.onAction || (() => {});
    this.onDismiss = options.onDismiss || (() => {});
    this.element = null;
  }

  show() {
    this.element = document.createElement('div');
    this.element.className = 'reflection-card';
    this._render();

    // Insert after anchor or at top of container
    if (this.anchor) {
      if (this.anchor.parentElement) {
        this.anchor.parentElement.insertBefore(this.element, this.anchor.nextSibling);
      }
    } else {
      // Fallback: insert at top of main content
      const content = document.querySelector('.main-content') || document.body;
      content.insertBefore(this.element, content.firstChild);
    }

    // Animate in
    requestAnimationFrame(() => {
      this.element.classList.add('visible');
    });

    return this;
  }

  _render() {
    const { phases } = this.config;
    const happened = phases.happened;
    const meaning = phases.meaning;
    const next = phases.next;

    const message = typeof happened.template === 'function'
      ? happened.template(this.context)
      : happened.template;

    const meaningQuestion = typeof meaning.template === 'function'
      ? meaning.template(this.context)
      : meaning.template;

    let optionsHtml = '';
    if (meaning.options) {
      const options = typeof meaning.options === 'function'
        ? meaning.options(this.context)
        : meaning.options;
      optionsHtml = `
        <div class="reflection-card-options">
          ${options.map(opt => `
            <button class="reflection-option" data-option-id="${opt.id}">
              ${opt.icon ? `<i class="ph ${opt.icon}"></i>` : ''}
              <span>${this._escapeHtml(opt.label)}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    let actionsHtml = '';
    if (next?.actions) {
      actionsHtml = `
        <div class="reflection-card-actions">
          ${next.actions.map(action => `
            <button class="reflection-action${action.primary ? ' primary' : ''}" data-action-id="${action.id}">
              ${this._escapeHtml(action.label)}
            </button>
          `).join('')}
        </div>
      `;
    }

    const icon = happened.icon || 'ph-info';

    this.element.innerHTML = `
      <div class="reflection-card-header">
        <i class="ph ${icon}"></i>
        <span class="reflection-card-title">${this._escapeHtml(message)}</span>
        <button class="reflection-card-dismiss" title="Dismiss">
          <i class="ph ph-x"></i>
        </button>
      </div>
      <div class="reflection-card-body">
        <div class="reflection-card-question">${this._escapeHtml(meaningQuestion)}</div>
        ${optionsHtml}
      </div>
      ${actionsHtml}
    `;

    this._bindEvents();
  }

  _bindEvents() {
    // Dismiss button
    this.element.querySelector('.reflection-card-dismiss')?.addEventListener('click', () => {
      this.dismiss();
    });

    // Option selection
    this.element.querySelectorAll('.reflection-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('.reflection-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.context.selectedOption = btn.dataset.optionId;
      });
    });

    // Actions
    this.element.querySelectorAll('.reflection-action').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onAction(btn.dataset.actionId, this.context);
        this.dismiss();
      });
    });
  }

  dismiss() {
    if (!this.element) return;
    this.element.classList.remove('visible');
    this.element.classList.add('dismissing');
    setTimeout(() => {
      this.element?.remove();
      this.element = null;
      this.onDismiss();
    }, 300);
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// Context Bar
// ============================================================================

/**
 * Persistent bar at bottom of screen showing the last action with undo
 */
class ContextBar {
  constructor() {
    this.element = null;
    this.currentAction = null;
    this.expanded = false;
    this._dismissTimer = null;
  }

  show(action) {
    this.currentAction = action;
    this.expanded = false;

    if (!this.element) {
      this._create();
    }

    this._render();
    this.element.classList.add('visible');

    // Auto-collapse after 10 seconds
    clearTimeout(this._dismissTimer);
    this._dismissTimer = setTimeout(() => {
      if (!this.expanded) {
        this.element.classList.remove('visible');
      }
    }, 10000);
  }

  _create() {
    this.element = document.createElement('div');
    this.element.className = 'context-bar';
    document.body.appendChild(this.element);
  }

  _render() {
    if (!this.currentAction) return;

    const config = REFLECTION_CONFIGS[this.currentAction.type];
    if (!config) return;

    const { phases } = config;
    const message = typeof phases.happened.template === 'function'
      ? phases.happened.template(this.currentAction.context)
      : phases.happened.template;

    const icon = phases.happened.icon || 'ph-info';

    let expandedContent = '';
    if (this.expanded) {
      const details = typeof phases.happened.details === 'function'
        ? phases.happened.details(this.currentAction.context)
        : phases.happened.details;

      const meaningQuestion = typeof phases.meaning.template === 'function'
        ? phases.meaning.template(this.currentAction.context)
        : phases.meaning.template;

      let optionsHtml = '';
      if (phases.meaning.options) {
        const options = typeof phases.meaning.options === 'function'
          ? phases.meaning.options(this.currentAction.context)
          : phases.meaning.options;
        optionsHtml = `
          <div class="context-bar-options">
            ${options.map(opt => `
              <button class="context-bar-option" data-option-id="${opt.id}">
                ${opt.icon ? `<i class="ph ${opt.icon}"></i>` : ''}
                ${this._escapeHtml(opt.label)}
              </button>
            `).join('')}
          </div>
        `;
      }

      let actionsHtml = '';
      if (phases.next?.actions) {
        actionsHtml = `
          <div class="context-bar-actions-expanded">
            ${phases.next.actions.map(action => `
              <button class="context-bar-action${action.primary ? ' primary' : ''}" data-action-id="${action.id}">
                ${this._escapeHtml(action.label)}
              </button>
            `).join('')}
          </div>
        `;
      }

      expandedContent = `
        <div class="context-bar-expanded">
          ${details?.length ? `
            <div class="context-bar-details">
              ${details.map(d => `<span>${this._escapeHtml(d)}</span>`).join(' • ')}
            </div>
          ` : ''}
          <div class="context-bar-meaning">
            <span class="context-bar-question">${this._escapeHtml(meaningQuestion)}</span>
            ${optionsHtml}
          </div>
          ${actionsHtml}
        </div>
      `;
    }

    this.element.innerHTML = `
      <div class="context-bar-main">
        <i class="ph ${icon}"></i>
        <span class="context-bar-message">${this._escapeHtml(message)}</span>
        <div class="context-bar-buttons">
          ${config.canUndo ? '<button class="context-bar-undo" title="Undo"><i class="ph ph-arrow-counter-clockwise"></i> Undo</button>' : ''}
          <button class="context-bar-expand" title="What changed?">
            <i class="ph ph-caret-${this.expanded ? 'down' : 'up'}"></i>
            ${this.expanded ? 'Less' : 'What changed?'}
          </button>
        </div>
      </div>
      ${expandedContent}
    `;

    this._bindEvents();
  }

  _bindEvents() {
    // Undo
    this.element.querySelector('.context-bar-undo')?.addEventListener('click', () => {
      if (this.currentAction?.onUndo) {
        this.currentAction.onUndo();
      }
      this.hide();
    });

    // Expand/collapse
    this.element.querySelector('.context-bar-expand')?.addEventListener('click', () => {
      this.expanded = !this.expanded;
      clearTimeout(this._dismissTimer);
      this._render();
    });

    // Options
    this.element.querySelectorAll('.context-bar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('.context-bar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (this.currentAction) {
          this.currentAction.context.selectedOption = btn.dataset.optionId;
        }
      });
    });

    // Actions
    this.element.querySelectorAll('.context-bar-action').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentAction?.onAction) {
          this.currentAction.onAction(btn.dataset.actionId, this.currentAction.context);
        }
        this.hide();
      });
    });
  }

  hide() {
    clearTimeout(this._dismissTimer);
    this.element?.classList.remove('visible');
    this.currentAction = null;
    this.expanded = false;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// Reflection Queue Panel
// ============================================================================

/**
 * Panel showing pending reflections for batch review
 */
class ReflectionQueuePanel {
  constructor(store) {
    this.store = store;
    this.element = null;
    this.visible = false;
    this._unsubscribe = null;
  }

  init() {
    this._createIndicator();
    this._unsubscribe = this.store.subscribe(() => this._updateIndicator());
  }

  _createIndicator() {
    // Find the tab bar or create standalone indicator
    const tabBar = document.querySelector('.tab-bar-wrapper') || document.querySelector('.sidebar-header');

    if (tabBar) {
      this.indicator = document.createElement('button');
      this.indicator.className = 'reflection-queue-indicator';
      this.indicator.innerHTML = `
        <i class="ph ph-clipboard-text"></i>
        <span class="reflection-queue-count">0</span>
      `;
      this.indicator.title = 'Pending reflections';
      this.indicator.addEventListener('click', () => this.toggle());

      // Insert after or inside the tab bar area
      tabBar.appendChild(this.indicator);
    }

    this._updateIndicator();
  }

  _updateIndicator() {
    if (!this.indicator) return;
    const count = this.store.getPendingCount();
    this.indicator.querySelector('.reflection-queue-count').textContent = count;
    this.indicator.classList.toggle('has-pending', count > 0);

    // Update panel if visible
    if (this.visible && this.element) {
      this._renderPanel();
    }
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (!this.element) {
      this._createPanel();
    }
    this._renderPanel();
    this.element.classList.add('visible');
    this.visible = true;
  }

  hide() {
    this.element?.classList.remove('visible');
    this.visible = false;
  }

  _createPanel() {
    this.element = document.createElement('div');
    this.element.className = 'reflection-queue-panel';
    document.body.appendChild(this.element);
  }

  _renderPanel() {
    const pending = this.store.getPending();

    if (pending.length === 0) {
      this.element.innerHTML = `
        <div class="reflection-queue-header">
          <h3>Pending Reflections</h3>
          <button class="reflection-queue-close"><i class="ph ph-x"></i></button>
        </div>
        <div class="reflection-queue-empty">
          <i class="ph ph-check-circle"></i>
          <span>All caught up!</span>
        </div>
      `;
    } else {
      this.element.innerHTML = `
        <div class="reflection-queue-header">
          <h3>Pending Reflections</h3>
          <button class="reflection-queue-close"><i class="ph ph-x"></i></button>
        </div>
        <div class="reflection-queue-list">
          ${pending.map(item => this._renderQueueItem(item)).join('')}
        </div>
        <div class="reflection-queue-footer">
          <button class="reflection-queue-review-all">Review All</button>
          <button class="reflection-queue-dismiss-all">Dismiss All</button>
        </div>
      `;
    }

    this._bindPanelEvents();
  }

  _renderQueueItem(item) {
    const config = REFLECTION_CONFIGS[item.type];
    if (!config) return '';

    const message = typeof config.phases.happened.template === 'function'
      ? config.phases.happened.template(item.context)
      : config.phases.happened.template;

    const icon = config.phases.happened.icon || 'ph-info';
    const timeAgo = this._formatTimeAgo(item.timestamp);

    // Get a hint about what needs attention
    let hint = '';
    if (config.phases.meaning.questions) {
      const questions = typeof config.phases.meaning.questions === 'function'
        ? config.phases.meaning.questions(item.context)
        : config.phases.meaning.questions;
      if (questions?.length) {
        hint = questions[0].label || '';
      }
    }

    return `
      <div class="reflection-queue-item" data-id="${item.id}">
        <div class="reflection-queue-item-header">
          <i class="ph ${icon}"></i>
          <span class="reflection-queue-item-title">${this._escapeHtml(message)}</span>
          <span class="reflection-queue-item-time">${timeAgo}</span>
        </div>
        ${hint ? `<div class="reflection-queue-item-hint">${this._escapeHtml(hint)}</div>` : ''}
        <div class="reflection-queue-item-actions">
          <button class="review-btn" data-id="${item.id}">Review</button>
          <button class="dismiss-btn" data-id="${item.id}">Dismiss</button>
        </div>
      </div>
    `;
  }

  _bindPanelEvents() {
    // Close
    this.element.querySelector('.reflection-queue-close')?.addEventListener('click', () => {
      this.hide();
    });

    // Review individual
    this.element.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = this.store.pending.find(p => p.id === id);
        if (item) {
          // Show expandable toast for this item
          const toast = new ExpandableToast({
            type: item.type,
            context: item.context,
            store: this.store,
            onAction: (actionId, ctx) => {
              this.store.complete(id, { action: actionId, context: ctx });
            }
          });
          toast.show();
          toast.expand();
        }
      });
    });

    // Dismiss individual
    this.element.querySelectorAll('.dismiss-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.store.dismiss(btn.dataset.id);
      });
    });

    // Dismiss all
    this.element.querySelector('.reflection-queue-dismiss-all')?.addEventListener('click', () => {
      this.store.dismissAll();
    });

    // Review all
    this.element.querySelector('.reflection-queue-review-all')?.addEventListener('click', () => {
      // Show first pending item
      const pending = this.store.getPending();
      if (pending.length > 0) {
        const item = pending[0];
        const toast = new ExpandableToast({
          type: item.type,
          context: item.context,
          store: this.store,
          onAction: (actionId, ctx) => {
            this.store.complete(item.id, { action: actionId, context: ctx });
          }
        });
        toast.show();
        toast.expand();
      }
    });
  }

  _formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
    this.element?.remove();
    this.indicator?.remove();
  }
}

// ============================================================================
// Main Reflection System
// ============================================================================

/**
 * Central controller for the reflection system
 */
class EOReflectionSystem {
  constructor(options = {}) {
    this.store = new ReflectionStore();
    this.contextBar = new ContextBar();
    this.queuePanel = new ReflectionQueuePanel(this.store);
    this.eventBus = options.eventBus || null;
    this._actionHandlers = new Map();
  }

  /**
   * Initialize the reflection system
   */
  init() {
    this.queuePanel.init();
    this._setupEventBusListeners();
    console.log('EO Reflection System initialized');
  }

  /**
   * Register a handler for reflection actions
   */
  onAction(type, actionId, handler) {
    const key = `${type}:${actionId}`;
    this._actionHandlers.set(key, handler);
  }

  /**
   * Trigger a reflection after an action
   */
  reflect(type, context, options = {}) {
    const config = REFLECTION_CONFIGS[type];
    if (!config) {
      console.warn(`Unknown reflection type: ${type}`);
      return;
    }

    const handleAction = (actionId, ctx) => {
      const handler = this._actionHandlers.get(`${type}:${actionId}`);
      if (handler) {
        handler(ctx);
      }
      // Emit event for integration
      if (this.eventBus) {
        this.eventBus.emit('reflection:action', { type, actionId, context: ctx });
      }
    };

    switch (config.priority) {
      case REFLECTION_PRIORITY.IMMEDIATE:
        // Show expandable toast
        const toast = new ExpandableToast({
          type,
          context,
          store: this.store,
          onAction: handleAction
        });
        toast.show();
        break;

      case REFLECTION_PRIORITY.CONTEXTUAL:
        // Show inline card if anchor provided, otherwise use context bar
        if (options.anchor) {
          const card = new ReflectionCard({
            type,
            context,
            anchor: options.anchor,
            onAction: handleAction
          });
          card.show();
        } else {
          this.contextBar.show({
            type,
            context,
            onAction: handleAction,
            onUndo: options.onUndo
          });
        }
        break;

      case REFLECTION_PRIORITY.DEFERRED:
        // Add to queue and show brief toast
        this.store.add({ type, context });
        this._showBriefToast(config.phases.happened, context);
        break;
    }

    // Emit event for tracking
    if (this.eventBus) {
      this.eventBus.emit('reflection:triggered', { type, context, priority: config.priority });
    }
  }

  /**
   * Show a brief non-expandable toast for deferred reflections
   */
  _showBriefToast(happened, context) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const message = typeof happened.template === 'function'
      ? happened.template(context)
      : happened.template;

    const icon = happened.icon || 'ph-info';

    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `
      <i class="ph ${icon} toast-icon"></i>
      <span class="toast-message">${this._escapeHtml(message)}</span>
      <span class="toast-pending-hint">Added to review queue</span>
      <button class="toast-close"><i class="ph ph-x"></i></button>
    `;

    container.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  /**
   * Setup event bus listeners for automatic reflection triggers
   */
  _setupEventBusListeners() {
    if (!this.eventBus) return;

    // Listen for EO events that should trigger reflection
    this.eventBus.on('GIVEN_RECORDED', (event) => {
      if (event.payload?.action === 'import') {
        this.reflect(REFLECTION_TYPES.IMPORT, {
          sourceName: event.payload.sourceName || 'Unknown',
          recordCount: event.payload.recordCount || 0,
          columnCount: event.payload.columnCount || 0
        });
      }
    });

    this.eventBus.on('ENTITY_MERGED', (event) => {
      this.reflect(REFLECTION_TYPES.MERGE_RECORDS, {
        recordCount: event.payload?.recordCount || 2,
        mergedIds: event.payload?.mergedIds || []
      });
    });
  }

  /**
   * Get the reflection store
   */
  getStore() {
    return this.store;
  }

  /**
   * Get pending reflection count
   */
  getPendingCount() {
    return this.store.getPendingCount();
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REFLECTION_TYPES,
    REFLECTION_PRIORITY,
    REFLECTION_CONFIGS,
    ReflectionStore,
    ExpandableToast,
    ReflectionCard,
    ContextBar,
    ReflectionQueuePanel,
    EOReflectionSystem
  };
}

if (typeof window !== 'undefined') {
  window.EOReflection = {
    TYPES: REFLECTION_TYPES,
    PRIORITY: REFLECTION_PRIORITY,
    CONFIGS: REFLECTION_CONFIGS,
    Store: ReflectionStore,
    Toast: ExpandableToast,
    Card: ReflectionCard,
    ContextBar,
    QueuePanel: ReflectionQueuePanel,
    System: EOReflectionSystem
  };

  // Auto-initialize
  document.addEventListener('DOMContentLoaded', () => {
    const eventBus = window.eoEventBus || (typeof getEventBus === 'function' ? getEventBus() : null);
    window.reflectionSystem = new EOReflectionSystem({ eventBus });
    window.reflectionSystem.init();
  });
}
