/**
 * EO Shared Utilities
 *
 * Common utility functions used across EO modules.
 * Extracted to eliminate code duplication and ensure consistent behavior.
 */

const EoSharedUtils = {
  /**
   * Format a type value into a display name.
   * Replaces underscores with spaces and capitalizes each word.
   *
   * @param {string} typeValue - The type value to format (e.g., "real_estate")
   * @returns {string} - Formatted name (e.g., "Real Estate")
   */
  formatTypeName(typeValue) {
    const str = String(typeValue);
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  },

  /**
   * Get an appropriate icon class for a record type.
   * Returns Phosphor icon classes based on semantic type matching.
   *
   * @param {string} typeValue - The type value to get an icon for
   * @returns {string} - Phosphor icon class (e.g., "ph-user")
   */
  getIconForType(typeValue) {
    const iconMap = {
      'person': 'ph-user',
      'people': 'ph-users',
      'user': 'ph-user',
      'org': 'ph-buildings',
      'organization': 'ph-buildings',
      'company': 'ph-building-office',
      'government': 'ph-bank',
      'nonprofit': 'ph-heart',
      'contract': 'ph-file-text',
      'document': 'ph-file-doc',
      'property': 'ph-house',
      'real_estate': 'ph-house-line',
      'funding': 'ph-money',
      'payment': 'ph-credit-card',
      'transaction': 'ph-arrows-left-right',
      'bank_account': 'ph-bank',
      'event': 'ph-calendar',
      'meeting': 'ph-calendar-check',
      'complaint': 'ph-warning',
      'violation': 'ph-shield-warning'
    };
    return iconMap[String(typeValue).toLowerCase()] || 'ph-stack';
  }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EoSharedUtils;
}
if (typeof window !== 'undefined') {
  window.EoSharedUtils = EoSharedUtils;
}
