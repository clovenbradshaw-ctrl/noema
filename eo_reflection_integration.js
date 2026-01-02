/**
 * EO Reflection Integration
 *
 * Provides easy-to-use helper methods for triggering reflections
 * from the main data workbench operations.
 *
 * Usage:
 *   EOReflectionIntegration.onImport({ sourceName, recordCount, ... });
 *   EOReflectionIntegration.onFilter({ filteredCount, totalCount, ... });
 *   EOReflectionIntegration.onMerge({ recordCount, mergedIds });
 */

const EOReflectionIntegration = {
  /**
   * Get the reflection system instance
   */
  _getSystem() {
    return window.reflectionSystem || null;
  },

  /**
   * Trigger reflection after importing data
   *
   * @param {Object} context
   * @param {string} context.sourceName - Name of the imported file
   * @param {number} context.recordCount - Number of records imported
   * @param {number} context.columnCount - Number of columns detected
   * @param {string} context.sourceType - Type of source (CSV, JSON, etc.)
   * @param {Array} context.ambiguousColumns - Columns that need interpretation
   * @param {Array} context.warnings - Import warnings
   */
  onImport(context) {
    const system = this._getSystem();
    if (!system) {
      console.warn('Reflection system not initialized');
      return;
    }

    // Detect ambiguous columns if not provided
    if (!context.ambiguousColumns && context.columns) {
      context.ambiguousColumns = context.columns.filter(col => {
        const name = (col.name || col).toLowerCase();
        // Common ambiguous field names
        return ['status', 'type', 'category', 'amount', 'value', 'date', 'id'].some(
          ambig => name.includes(ambig)
        );
      }).map(col => ({
        name: col.name || col,
        suggestions: this._getSuggestions(col.name || col)
      }));
    }

    system.reflect(window.EOReflection.TYPES.IMPORT, context);
  },

  /**
   * Trigger reflection after creating a filter
   *
   * @param {Object} context
   * @param {number} context.filteredCount - Number of records after filter
   * @param {number} context.totalCount - Total records before filter
   * @param {string} context.filterDescription - Human-readable filter description
   * @param {HTMLElement} context.anchor - DOM element to anchor the card near
   */
  onFilter(context, options = {}) {
    const system = this._getSystem();
    if (!system) return;

    system.reflect(window.EOReflection.TYPES.FILTER, context, options);
  },

  /**
   * Trigger reflection after saving a lens
   *
   * @param {Object} context
   * @param {string} context.lensName - Name of the lens
   * @param {string} context.sourceSet - Name of the source set
   * @param {number} context.recordCount - Number of records in lens
   * @param {string} context.filterDescription - Filter description if any
   */
  onSaveLens(context) {
    const system = this._getSystem();
    if (!system) return;

    system.reflect(window.EOReflection.TYPES.SAVE_LENS, context);
  },

  /**
   * Trigger reflection after merging records
   *
   * @param {Object} context
   * @param {number} context.recordCount - Number of records merged
   * @param {Array} context.mergedIds - IDs of merged records
   * @param {Function} options.onUndo - Callback to undo the merge
   */
  onMerge(context, options = {}) {
    const system = this._getSystem();
    if (!system) return;

    system.reflect(window.EOReflection.TYPES.MERGE_RECORDS, context, options);
  },

  /**
   * Trigger reflection when conflicts are detected
   *
   * @param {Object} context
   * @param {string} context.fieldName - Name of the field with conflict
   * @param {Array} context.values - Array of { value, source } objects
   * @param {string} context.explanation - Why values differ
   */
  onConflict(context, options = {}) {
    const system = this._getSystem();
    if (!system) return;

    context.valueCount = context.values?.length || 0;
    system.reflect(window.EOReflection.TYPES.RESOLVE_CONFLICT, context, options);
  },

  /**
   * Trigger reflection after creating a new column
   *
   * @param {Object} context
   * @param {string} context.columnName - Name of the new column
   * @param {string} context.columnType - 'derived' or 'manual'
   * @param {string} context.formula - Formula if derived
   * @param {Array} context.dependencies - Field dependencies if derived
   */
  onCreateColumn(context, options = {}) {
    const system = this._getSystem();
    if (!system) return;

    system.reflect(window.EOReflection.TYPES.CREATE_COLUMN, context, options);
  },

  /**
   * Trigger reflection after pivot/re-center
   *
   * @param {Object} context
   * @param {string} context.pivotField - Field used for pivot
   * @param {string} context.previousCenter - Previous center of identity
   */
  onPivot(context, options = {}) {
    const system = this._getSystem();
    if (!system) return;

    system.reflect(window.EOReflection.TYPES.PIVOT, context, options);
  },

  /**
   * Trigger reflection before export
   *
   * @param {Object} context
   * @param {number} context.recordCount - Number of records to export
   * @param {string} context.format - Export format (CSV, JSON, etc.)
   * @param {string} context.sourceSet - Source set name
   */
  onExport(context) {
    const system = this._getSystem();
    if (!system) return;

    system.reflect(window.EOReflection.TYPES.EXPORT, context);
  },

  /**
   * Register a handler for reflection actions
   *
   * @param {string} type - Reflection type (from EOReflection.TYPES)
   * @param {string} actionId - Action ID (e.g., 'apply_suggestions')
   * @param {Function} handler - Handler function receiving context
   */
  onAction(type, actionId, handler) {
    const system = this._getSystem();
    if (!system) return;

    system.onAction(type, actionId, handler);
  },

  /**
   * Get pending reflection count
   */
  getPendingCount() {
    const system = this._getSystem();
    return system ? system.getPendingCount() : 0;
  },

  /**
   * Helper: Generate suggestions for ambiguous column names
   */
  _getSuggestions(columnName) {
    const name = columnName.toLowerCase();
    const suggestions = [];

    if (name.includes('status')) {
      suggestions.push('case_status', 'housing_status', 'employment_status', 'active_status');
    }
    if (name.includes('type')) {
      suggestions.push('record_type', 'entity_type', 'category');
    }
    if (name.includes('amount') || name.includes('value')) {
      suggestions.push('currency:USD', 'currency:EUR', 'numeric_count');
    }
    if (name.includes('date')) {
      suggestions.push('date:ISO', 'date:US', 'date:EU');
    }

    return suggestions;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.EOReflectionIntegration = EOReflectionIntegration;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EOReflectionIntegration;
}
