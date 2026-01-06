/**
 * EO Definition Journey - Human-Centered Ontology Interface
 *
 * Core shift: From "Definitions as Objects" → "Definitions as Journeys"
 * A definition is not a record—it's a commitment made under conditions.
 *
 * This UI follows human sensemaking order:
 *   What is this thing? → How stable is it? → Where does it apply? → How credible?
 *
 * Instead of exposing 9 EO aspects as fields, we ask 3 human questions
 * and derive the ontological structure behind the scenes.
 *
 * Key principle: Ontology isn't discovered by inspection—it's discovered by PRESSURE.
 */

// ============================================================================
// SECTION I: Configuration & Constants
// ============================================================================

const DefinitionJourneyConfig = {
  // Auto-advance to next step after selection (with brief delay for feedback)
  autoAdvanceMs: 600,

  // Show completion ring threshold (minimum aspects to show)
  minAspectsForRing: 3,

  // Enable consequence tooltips
  showConsequences: true
};

/**
 * Stability diagnostic - the one-question test
 * "When I try to stabilize this thing, does it dissolve, shift, or hold?"
 *
 * These are frame-typical examples, not eternal truths.
 * The same phenomenon can appear in all three lists depending on
 * time horizon, observer role, and intervention style.
 */
const StabilityDiagnostic = Object.freeze({
  DISSOLVES: {
    id: 'dissolves',
    answer: 'It dissolves',
    shortDesc: 'Naming or measuring destroys the signal',
    ontologicalType: 'emanon',
    signature: 'Ground overwhelms figure. Observation is constitutive.',
    example: '"The more we measure culture, the less culture we recognize."',
    pattern: 'Measurement ≠ clarity. Observation is invasive.',
    consequences: {
      safe: ['Observation', 'Contextual notes'],
      risky: ['Hard metrics', 'Automation', 'Cross-system comparisons'],
      guidance: 'Avoid hard constraints. Reassess meaning often.'
    },
    followUp: {
      answer: 'It reverts or fades',
      confirmation: 'Without attention, it loses definition'
    },
    // Concrete examples to help users recognize emanons
    examples: [
      {
        name: 'Organizational culture',
        context: 'short-term, metric-heavy frame',
        insight: 'The moment you score it, people start performing to the score. Culture turns into theater.'
      },
      {
        name: 'Trust in a relationship',
        context: 'interpersonal dynamics',
        insight: 'Asking "Do you trust me?" repeatedly is a great way to ensure the answer degrades.'
      },
      {
        name: 'Market confidence',
        context: 'financial/economic frame',
        insight: 'Surveys and sentiment indexes don\'t reveal confidence—they become part of it.'
      },
      {
        name: '"The vibe" of a room or event',
        context: 'social dynamics',
        insight: 'Naming it ("this feels tense") often changes it instantly.'
      },
      {
        name: 'Authenticity',
        context: 'personal/brand identity',
        insight: 'The moment someone tries to demonstrate it deliberately, it evaporates.'
      }
    ]
  },
  SHIFTS: {
    id: 'shifts',
    answer: 'It shifts trajectory',
    shortDesc: 'Stabilization steers it—measurement becomes feedback',
    ontologicalType: 'protogon',
    signature: 'Pattern dominates. Time matters more than state.',
    example: '"Paying attention changes where this is going."',
    pattern: 'The present matters less than the direction.',
    consequences: {
      safe: ['Status tracking', 'Trend analysis', 'Lifecycle stages'],
      risky: ['Point-in-time snapshots as truth', 'Static reporting'],
      guidance: 'Track trajectories, not states. Claims expire—date them.'
    },
    followUp: {
      answer: 'It continues becoming',
      confirmation: 'It has momentum independent of observation'
    },
    // Concrete examples to help users recognize protogons
    examples: [
      {
        name: 'A startup in its first 18 months',
        context: 'organizational development',
        insight: 'Metrics, naming ("Series A–ready"), and strategy discussions actively reshape what it becomes.'
      },
      {
        name: 'A social movement before it institutionalizes',
        context: 'collective action',
        insight: 'Media attention doesn\'t dissolve it—it pushes it toward slogans, leaders, and factions.'
      },
      {
        name: 'Skill development',
        context: 'learning to write, code, or lead',
        insight: 'Feedback changes how the skill grows, not just how fast.'
      },
      {
        name: 'A new team forming',
        context: 'group dynamics',
        insight: 'Early labels ("this is an execution team") bias norms before they stabilize.'
      },
      {
        name: 'An emerging technology standard',
        context: 'tech ecosystem',
        insight: 'Each draft spec alters the ecosystem it\'s trying to describe.'
      }
    ]
  },
  HOLDS: {
    id: 'holds',
    answer: 'It holds its shape',
    shortDesc: 'Stabilization clarifies—measurement converges',
    ontologicalType: 'holon',
    signature: 'Figure, pattern, and ground are in balance.',
    example: '"We can look at this from many angles and still agree."',
    pattern: 'Multiple observers converge. Intervention stays local.',
    consequences: {
      safe: ['Hard metrics', 'Automation', 'Cross-system joins', 'Historical comparisons'],
      risky: [],
      guidance: 'Safe for computation. Identity persists through perturbation.'
    },
    followUp: {
      answer: 'It self-maintains',
      confirmation: 'It retains identity without continuous intervention'
    },
    // Concrete examples to help users recognize holons
    examples: [
      {
        name: 'A living cell',
        context: 'biological systems',
        insight: 'Measured, probed, stressed—it maintains identity through regulation.'
      },
      {
        name: 'A mature organization with established processes',
        context: 'organizational stability',
        insight: 'Audits don\'t change what it is; they reveal how it works.'
      },
      {
        name: 'A legal contract',
        context: 'legal/formal agreements',
        insight: 'Interpretation may vary, but the entity itself persists.'
      },
      {
        name: 'A well-designed software service with clear APIs',
        context: 'technical systems',
        insight: 'You can test, monitor, and refactor locally without destabilizing the whole.'
      },
      {
        name: 'An ecosystem at steady state',
        context: 'over a long observation frame',
        insight: 'Disturbances are absorbed without identity collapse.'
      }
    ]
  }
});

/**
 * Definition origin types - where does meaning come from?
 */
const DefinitionOrigin = Object.freeze({
  STANDARD: {
    id: 'standard',
    label: 'Borrowed from a standard',
    description: 'This meaning comes from an external authority (regulation, standard body, etc.)',
    icon: 'ph-link',
    requiresUri: true
  },
  LOCAL_STABLE: {
    id: 'local_stable',
    label: 'Local but stable',
    description: 'Our organization defined this, and the meaning is settled',
    icon: 'ph-house',
    requiresUri: false
  },
  LOCAL_EVOLVING: {
    id: 'local_evolving',
    label: 'Local and still evolving',
    description: 'We\'re still figuring out exactly what this means',
    icon: 'ph-pencil-simple',
    requiresUri: false
  }
});

/**
 * Scale levels - where does this meaning apply?
 */
const ScaleLevel = Object.freeze({
  RECORD: { id: 'record', label: 'Single record', description: 'This value identifies or describes one specific thing' },
  CASE: { id: 'case', label: 'Matter / case', description: 'This meaning spans a case, project, or engagement' },
  PROJECT: { id: 'project', label: 'Project / dataset', description: 'This meaning is consistent within a project' },
  ORG: { id: 'org', label: 'Organization-wide', description: 'Everyone in the org uses this the same way' },
  CROSS_SYSTEM: { id: 'cross_system', label: 'Cross-system / external', description: 'This meaning travels outside our organization' }
});

/**
 * Temporal patterns - does meaning change over time?
 */
const TemporalPattern = Object.freeze({
  FIXED: { id: 'fixed', label: 'No—this meaning is stable', icon: 'ph-lock' },
  LIFECYCLE: { id: 'lifecycle', label: 'Yes, by lifecycle stage', icon: 'ph-arrows-split' },
  POLICY: { id: 'policy', label: 'Yes, by policy or version', icon: 'ph-calendar' }
});

/**
 * Provenance credibility - how confident should downstream users be?
 */
const ProvenanceCredibility = Object.freeze({
  SYSTEM: {
    id: 'system',
    label: 'System-generated',
    description: 'Imported or computed automatically—enforced by data',
    weight: 'high',
    icon: 'ph-robot'
  },
  OPERATIONAL: {
    id: 'operational',
    label: 'Operationally defined',
    description: 'Backed by documented process or procedure',
    weight: 'high',
    icon: 'ph-clipboard-text'
  },
  JUDGMENT: {
    id: 'judgment',
    label: 'Human judgment',
    description: 'An expert decided—defensible but interpretive',
    weight: 'medium',
    icon: 'ph-user'
  },
  EXTERNAL: {
    id: 'external',
    label: 'External authority',
    description: 'Defined by regulation, standard, or contract',
    weight: 'high',
    icon: 'ph-seal'
  }
});

// ============================================================================
// SECTION II: Definition Journey Store
// ============================================================================

/**
 * DefinitionJourneyStore - Manages state through the definition journey
 * Captures user decisions and derives EO aspects behind the scenes
 */
class DefinitionJourneyStore {
  constructor(options = {}) {
    this.eventTarget = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

    // Ground truth - auto-captured from context
    this.ground = {
      sourceFile: options.sourceFile || null,
      fieldName: options.fieldName || null,
      valueShape: options.valueShape || null,   // string, numeric, uuid-like, etc.
      cardinality: options.cardinality || null, // unique, few, many
      nullRate: options.nullRate || null,
      entropy: options.entropy || null,
      systemOfOrigin: options.systemOfOrigin || null,
      sampleValues: options.sampleValues || []
    };

    // User journey state
    this.journey = {
      currentStep: 0,
      completed: new Set(),

      // Step 1: Semantic Core
      term: options.term || '',
      meaning: '',           // Plain-language meaning (1-2 sentences)
      origin: null,          // DefinitionOrigin selection

      // Step 2: Stability (via diagnostic question)
      stabilityAnswer: null, // StabilityDiagnostic selection
      stabilityConfirmed: false, // Follow-up question answered

      // Step 3: Application scope
      scales: new Set(),     // ScaleLevel selections (multi-select)
      temporalPattern: null, // TemporalPattern selection

      // Step 4: Credibility
      credibility: null,     // ProvenanceCredibility selection

      // Step 5: URI linking (optional, outcome not requirement)
      linkedUri: null,
      uriDeferred: false,
      uriSuggestions: [],

      // Additional context (optional deepening)
      jurisdiction: '',
      programs: [],
      validFrom: null,
      validTo: null,
      scopeNote: ''
    };

    // Derived EO aspects (computed from journey)
    this.derived = {
      stabilityLevel: null,  // holon, protogon, emanon
      epistemicWeight: null,
      provenanceTriad: {},
      semanticTriad: {},
      situationalTriad: {}
    };

    // Context from session
    this.context = {
      frame: options.frame || 'default_frame',
      user: options.user || 'anonymous',
      sessionId: options.sessionId || null
    };
  }

  /**
   * Get the total number of steps
   */
  get totalSteps() {
    return 5; // Semantic, Stability, Application, Credibility, URI
  }

  /**
   * Update journey state and emit event
   */
  update(path, value) {
    const parts = path.split('.');
    let current = this.journey;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }

    const key = parts[parts.length - 1];
    const oldValue = current[key];
    current[key] = value;

    // Mark step as touched
    const stepMap = {
      'term': 1, 'meaning': 1, 'origin': 1,
      'stabilityAnswer': 2, 'stabilityConfirmed': 2,
      'scales': 3, 'temporalPattern': 3,
      'credibility': 4,
      'linkedUri': 5, 'uriDeferred': 5
    };

    if (stepMap[key]) {
      this.journey.completed.add(stepMap[key]);
    }

    // Derive EO aspects
    this._deriveAspects();

    this._emit('journey:updated', { path, value, oldValue });
  }

  /**
   * Set stability answer from diagnostic question
   */
  setStabilityAnswer(answerId) {
    const diagnostic = Object.values(StabilityDiagnostic).find(d => d.id === answerId);
    if (diagnostic) {
      this.journey.stabilityAnswer = diagnostic;
      this.derived.stabilityLevel = diagnostic.ontologicalType;
      this.journey.completed.add(2);
      this._deriveAspects();
      this._emit('stability:set', { diagnostic });
    }
  }

  /**
   * Confirm stability with follow-up question
   */
  confirmStability() {
    this.journey.stabilityConfirmed = true;
    this._emit('stability:confirmed', {});
  }

  /**
   * Toggle scale selection
   */
  toggleScale(scaleId) {
    if (this.journey.scales.has(scaleId)) {
      this.journey.scales.delete(scaleId);
    } else {
      this.journey.scales.add(scaleId);
    }
    this.journey.completed.add(3);
    this._deriveAspects();
    this._emit('scales:updated', { scales: Array.from(this.journey.scales) });
  }

  /**
   * Set URI suggestion results
   */
  setUriSuggestions(suggestions) {
    this.journey.uriSuggestions = suggestions;
    this._emit('uri:suggestions', { suggestions });
  }

  /**
   * Select a URI from suggestions
   */
  selectUri(uri) {
    this.journey.linkedUri = uri;
    this.journey.uriDeferred = false;
    this.journey.completed.add(5);
    this._deriveAspects();
    this._emit('uri:selected', { uri });
  }

  /**
   * Defer URI linking (explicitly valid choice)
   */
  deferUri() {
    this.journey.linkedUri = null;
    this.journey.uriDeferred = true;
    this.journey.completed.add(5);
    this._emit('uri:deferred', {});
  }

  /**
   * Derive EO aspects from journey state
   * @private
   */
  _deriveAspects() {
    // Epistemic Triad
    this.derived.provenanceTriad = {
      agent: {
        userId: this.context.user,
        sessionId: this.context.sessionId,
        method: 'definition_journey'
      },
      method: this.journey.credibility?.id || 'pending',
      source: this.journey.linkedUri || (this.journey.origin?.id === 'standard' ? 'pending_uri' : 'local')
    };

    // Semantic Triad
    this.derived.semanticTriad = {
      term: this.journey.term,
      definition: this.journey.meaning,
      jurisdiction: this.journey.jurisdiction || this._inferJurisdiction()
    };

    // Situational Triad
    this.derived.situationalTriad = {
      scale: Array.from(this.journey.scales),
      timeframe: this.journey.temporalPattern?.id || 'fixed',
      background: this.ground
    };

    // Compute epistemic weight
    if (this.journey.credibility) {
      this.derived.epistemicWeight = this.journey.credibility.weight;
    }
  }

  /**
   * Infer jurisdiction from scales
   * @private
   */
  _inferJurisdiction() {
    if (this.journey.scales.has('cross_system')) return 'external';
    if (this.journey.scales.has('org')) return 'organizational';
    if (this.journey.scales.has('project')) return 'project';
    return 'local';
  }

  /**
   * Get completion status for the 9 aspects
   */
  getAspectCompletion() {
    const aspects = [
      { id: 'semantic', name: 'What it means', complete: !!this.journey.meaning },
      { id: 'stability', name: 'How stable', complete: !!this.journey.stabilityAnswer },
      { id: 'scale', name: 'Where it applies', complete: this.journey.scales.size > 0 },
      { id: 'time', name: 'Time behavior', complete: !!this.journey.temporalPattern },
      { id: 'provenance', name: 'Credibility', complete: !!this.journey.credibility },
      { id: 'jurisdiction', name: 'Jurisdiction', complete: !!this.journey.jurisdiction || this.journey.scales.size > 0 },
      { id: 'background', name: 'Context', complete: !!this.ground.sourceFile },
      { id: 'authority', name: 'Authority', complete: !!this.journey.origin },
      { id: 'uri', name: 'URI link', complete: !!this.journey.linkedUri || this.journey.uriDeferred }
    ];

    return aspects;
  }

  /**
   * Get risk assessment based on current state
   */
  getRiskAssessment() {
    const risks = [];
    const stability = this.journey.stabilityAnswer;

    if (!this.journey.meaning) {
      risks.push({ level: 'high', message: 'No meaning defined—humans can\'t interpret this consistently' });
    }

    if (!stability) {
      risks.push({ level: 'medium', message: 'Stability unknown—can\'t assess automation safety' });
    } else if (stability.id === 'dissolves') {
      if (this.journey.scales.has('cross_system')) {
        risks.push({ level: 'high', message: 'Emanon entity marked cross-system—meaning will diverge' });
      }
    } else if (stability.id === 'shifts') {
      if (!this.journey.temporalPattern || this.journey.temporalPattern.id === 'fixed') {
        risks.push({ level: 'medium', message: 'Protogon entity marked as fixed—claims will expire' });
      }
    }

    if (this.journey.origin?.requiresUri && !this.journey.linkedUri && !this.journey.uriDeferred) {
      risks.push({ level: 'medium', message: 'Standard definition without URI—interop limited' });
    }

    // Generate safety assessment
    const safeFor = [];
    const unsafeFor = [];

    if (stability?.id === 'holds') {
      safeFor.push('automation', 'cross-system joins', 'historical comparisons');
    } else if (stability?.id === 'shifts') {
      safeFor.push('trend analysis', 'lifecycle tracking');
      unsafeFor.push('point-in-time snapshots as truth');
    } else if (stability?.id === 'dissolves') {
      safeFor.push('contextual notes', 'observation');
      unsafeFor.push('hard metrics', 'automation');
    }

    return { risks, safeFor, unsafeFor };
  }

  /**
   * Build the final definition object (EO-compatible)
   */
  buildDefinition() {
    const stability = this.journey.stabilityAnswer;

    return {
      // Core identity
      referent: {
        term: this.journey.term,
        label: this.ground.fieldName || this.journey.term,
        level: this._inferReferentLevel(),
        dataType: this.ground.valueShape || 'string'
      },

      // Semantic commitment
      meaning: this.journey.meaning,
      scopeNote: this.journey.scopeNote,

      // Ontological classification
      stability: {
        level: this.derived.stabilityLevel,
        diagnosticAnswer: stability?.answer,
        signature: stability?.signature,
        consequences: stability?.consequences
      },

      // Origin & authority
      origin: this.journey.origin?.id,
      authority: this.journey.linkedUri ? {
        uri: this.journey.linkedUri.uri,
        name: this.journey.linkedUri.name,
        type: this.journey.linkedUri.type
      } : null,

      // Application scope
      scope: {
        scales: Array.from(this.journey.scales),
        temporalPattern: this.journey.temporalPattern?.id,
        jurisdiction: this.journey.jurisdiction || this._inferJurisdiction()
      },

      // Validity
      validity: {
        from: this.journey.validFrom,
        to: this.journey.validTo,
        programs: this.journey.programs
      },

      // Provenance
      provenance: {
        credibility: this.journey.credibility?.id,
        epistemicWeight: this.derived.epistemicWeight,
        assertedBy: this.context.user,
        method: 'definition_journey',
        assertedAt: new Date().toISOString()
      },

      // URI status
      uri: {
        linked: !!this.journey.linkedUri,
        deferred: this.journey.uriDeferred,
        value: this.journey.linkedUri?.uri || null
      },

      // Ground truth (auto-captured)
      ground: this.ground,

      // Frame binding
      frame: {
        id: `eo:frame/${this.context.frame}`,
        type: 'dataset'
      },

      // Full 9-element provenance
      provenanceTriad: this.derived.provenanceTriad,
      semanticTriad: this.derived.semanticTriad,
      situationalTriad: this.derived.situationalTriad
    };
  }

  /**
   * Infer referent level from ground data
   * @private
   */
  _inferReferentLevel() {
    if (this.ground.cardinality === 'unique') return 'key';
    if (this.ground.cardinality === 'few') return 'value';
    return 'entity';
  }

  /**
   * Load from existing definition
   */
  loadFromDefinition(def) {
    if (!def) return;

    // Restore term and meaning
    if (def.referent?.term) this.journey.term = def.referent.term;
    if (def.meaning) this.journey.meaning = def.meaning;
    if (def.scopeNote) this.journey.scopeNote = def.scopeNote;

    // Restore stability
    if (def.stability?.level) {
      const diagnostic = Object.values(StabilityDiagnostic)
        .find(d => d.ontologicalType === def.stability.level);
      if (diagnostic) {
        this.journey.stabilityAnswer = diagnostic;
        this.derived.stabilityLevel = diagnostic.ontologicalType;
      }
    }

    // Restore origin
    if (def.origin) {
      this.journey.origin = Object.values(DefinitionOrigin).find(o => o.id === def.origin);
    }

    // Restore scope
    if (def.scope?.scales) {
      this.journey.scales = new Set(def.scope.scales);
    }
    if (def.scope?.temporalPattern) {
      this.journey.temporalPattern = Object.values(TemporalPattern).find(t => t.id === def.scope.temporalPattern);
    }
    if (def.scope?.jurisdiction) {
      this.journey.jurisdiction = def.scope.jurisdiction;
    }

    // Restore credibility
    if (def.provenance?.credibility) {
      this.journey.credibility = Object.values(ProvenanceCredibility).find(c => c.id === def.provenance.credibility);
    }

    // Restore URI
    if (def.uri?.linked && def.authority) {
      this.journey.linkedUri = def.authority;
    }
    if (def.uri?.deferred) {
      this.journey.uriDeferred = true;
    }

    // Restore validity
    if (def.validity) {
      this.journey.validFrom = def.validity.from;
      this.journey.validTo = def.validity.to;
      this.journey.programs = def.validity.programs || [];
    }

    this._deriveAspects();
    this._emit('store:loaded', { definition: def });
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.journey = {
      currentStep: 0,
      completed: new Set(),
      term: '',
      meaning: '',
      origin: null,
      stabilityAnswer: null,
      stabilityConfirmed: false,
      scales: new Set(),
      temporalPattern: null,
      credibility: null,
      linkedUri: null,
      uriDeferred: false,
      uriSuggestions: [],
      jurisdiction: '',
      programs: [],
      validFrom: null,
      validTo: null,
      scopeNote: ''
    };
    this.derived = {
      stabilityLevel: null,
      epistemicWeight: null,
      provenanceTriad: {},
      semanticTriad: {},
      situationalTriad: {}
    };
    this._emit('store:reset', {});
  }

  /**
   * Emit event
   * @private
   */
  _emit(eventName, detail) {
    if (this.eventTarget) {
      try {
        this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
      } catch (e) {
        // EventTarget not available
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(eventName, handler) {
    if (this.eventTarget) {
      this.eventTarget.addEventListener(eventName, handler);
    }
    return () => {
      if (this.eventTarget) {
        this.eventTarget.removeEventListener(eventName, handler);
      }
    };
  }
}

// ============================================================================
// SECTION III: Definition Journey UI Panel
// ============================================================================

/**
 * DefinitionJourneyPanel - The main UI component
 * Progressive disclosure with ontological gravity
 */
class DefinitionJourneyPanel {
  constructor(options = {}) {
    this.store = options.store || new DefinitionJourneyStore(options);
    this.container = options.container || null;
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;
    this.api = options.api || null;

    // UI state
    this.expandedStep = 1; // Start with semantic core
    this.showFollowUp = false;

    // Inject styles
    injectDefinitionJourneyStyles();

    // Subscribe to store events
    this.store.on('journey:updated', () => this._updateDisplay());
    this.store.on('stability:set', () => {
      this.showFollowUp = true;
      this._updateDisplay();
    });
  }

  /**
   * Show the panel
   */
  show(initialData = null) {
    if (initialData) {
      this.store.loadFromDefinition(initialData);
    }
    this.render();
  }

  /**
   * Hide the panel
   */
  hide() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Main render
   */
  render() {
    if (!this.container) return;

    const journey = this.store.journey;
    const ground = this.store.ground;
    const aspects = this.store.getAspectCompletion();
    const risk = this.store.getRiskAssessment();

    this.container.innerHTML = `
      <div class="definition-journey">
        <!-- Ground Truth Banner (auto-captured) -->
        ${this._renderGroundBanner(ground)}

        <div class="journey-layout">
          <!-- Main Journey Flow -->
          <div class="journey-flow">
            ${this._renderStep1SemanticCore()}
            ${this._renderStep2StabilityDiagnostic()}
            ${this._renderStep3ApplicationScope()}
            ${this._renderStep4Credibility()}
            ${this._renderStep5UriLinking()}
            ${this._renderOptionalDeepening()}
          </div>

          <!-- Sidebar: Completion Ring & Risk -->
          <div class="journey-sidebar">
            ${this._renderCompletionRing(aspects)}
            ${this._renderRiskPanel(risk)}
            ${this._renderActions()}
          </div>
        </div>
      </div>
    `;

    this._attachEventHandlers();
  }

  /**
   * Render ground truth banner (Step 0 - invisible to user as "input")
   */
  _renderGroundBanner(ground) {
    if (!ground.sourceFile && !ground.fieldName) return '';

    return `
      <div class="ground-banner">
        <div class="ground-icon"><i class="ph ph-database"></i></div>
        <div class="ground-content">
          <div class="ground-label">Auto-detected from your data</div>
          <div class="ground-details">
            ${ground.fieldName ? `<span class="ground-item"><strong>${this._escapeHtml(ground.fieldName)}</strong></span>` : ''}
            ${ground.sourceFile ? `<span class="ground-item">from ${this._escapeHtml(ground.sourceFile)}</span>` : ''}
            ${ground.valueShape ? `<span class="ground-item ground-badge">${ground.valueShape}</span>` : ''}
            ${ground.cardinality ? `<span class="ground-item ground-badge">${ground.cardinality} values</span>` : ''}
          </div>
          ${ground.sampleValues?.length ? `
            <div class="ground-samples">
              Sample: ${ground.sampleValues.slice(0, 3).map(v => `<code>${this._escapeHtml(String(v))}</code>`).join(', ')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Step 1: Semantic Core - "What Is This?"
   */
  _renderStep1SemanticCore() {
    const journey = this.store.journey;
    const isComplete = journey.term && journey.meaning && journey.origin;
    const isExpanded = this.expandedStep === 1;

    return `
      <div class="journey-step ${isComplete ? 'complete' : ''} ${isExpanded ? 'expanded' : ''}" data-step="1">
        <div class="step-header" data-action="toggle-step" data-step="1">
          <div class="step-indicator">
            ${isComplete ? '<i class="ph ph-check-circle"></i>' : '<span class="step-num">1</span>'}
          </div>
          <div class="step-title">
            <h3>What is this?</h3>
            ${!isExpanded && journey.term ? `<span class="step-summary">${this._escapeHtml(journey.term)}</span>` : ''}
          </div>
          <div class="step-toggle"><i class="ph ph-caret-down"></i></div>
        </div>

        <div class="step-content">
          <p class="step-prompt">When someone uses this field, what are they actually talking about?</p>

          <div class="field-group">
            <label>Primary Term</label>
            <input type="text"
                   class="journey-input"
                   name="term"
                   value="${this._escapeHtml(journey.term)}"
                   placeholder="${this.store.ground.fieldName || 'e.g., Housing Status'}" />
          </div>

          <div class="field-group">
            <label>Plain-language meaning <span class="required">*</span></label>
            <textarea class="journey-textarea"
                      name="meaning"
                      rows="2"
                      placeholder="In 1-2 sentences, what does this mean in your context?">${this._escapeHtml(journey.meaning)}</textarea>
            <div class="field-hint">Be specific. This is YOUR operational commitment.</div>
          </div>

          <div class="field-group">
            <label>Is this definition borrowed or local?</label>
            <div class="origin-options">
              ${Object.values(DefinitionOrigin).map(origin => `
                <div class="origin-option ${journey.origin?.id === origin.id ? 'selected' : ''}"
                     data-action="select-origin"
                     data-origin="${origin.id}">
                  <div class="origin-icon"><i class="ph ${origin.icon}"></i></div>
                  <div class="origin-text">
                    <div class="origin-label">${origin.label}</div>
                    <div class="origin-desc">${origin.description}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: Stability Diagnostic - "How Real Is This?"
   */
  _renderStep2StabilityDiagnostic() {
    const journey = this.store.journey;
    const isComplete = !!journey.stabilityAnswer;
    const isExpanded = this.expandedStep === 2;
    const selected = journey.stabilityAnswer;

    return `
      <div class="journey-step ${isComplete ? 'complete' : ''} ${isExpanded ? 'expanded' : ''}" data-step="2">
        <div class="step-header" data-action="toggle-step" data-step="2">
          <div class="step-indicator">
            ${isComplete ? '<i class="ph ph-check-circle"></i>' : '<span class="step-num">2</span>'}
          </div>
          <div class="step-title">
            <h3>How stable is this?</h3>
            ${!isExpanded && selected ? `<span class="step-summary stability-${selected.ontologicalType}">${selected.ontologicalType}</span>` : ''}
          </div>
          <div class="step-toggle"><i class="ph ph-caret-down"></i></div>
        </div>

        <div class="step-content">
          <div class="diagnostic-question">
            <div class="question-icon"><i class="ph ph-question"></i></div>
            <p class="question-text">
              <strong>When you try to stabilize this thing</strong>—by naming it, measuring it, or managing it—<br/>
              does it <em>dissolve</em>, <em>shift trajectory</em>, or <em>hold its shape</em>?
            </p>
          </div>

          <div class="stability-options">
            ${Object.values(StabilityDiagnostic).map(diag => `
              <div class="stability-option ${selected?.id === diag.id ? 'selected' : ''}"
                   data-action="select-stability"
                   data-stability="${diag.id}">
                <div class="stability-main">
                  <div class="stability-answer">${diag.answer}</div>
                  <div class="stability-desc">${diag.shortDesc}</div>
                  <button class="stability-examples-toggle"
                          data-action="toggle-examples"
                          data-stability="${diag.id}"
                          title="See examples">
                    <i class="ph ph-info"></i> Examples
                  </button>
                </div>
                ${selected?.id === diag.id ? `
                  <div class="stability-detail">
                    <div class="stability-signature">${diag.signature}</div>
                    <div class="stability-example">${diag.example}</div>
                    <div class="stability-pattern"><strong>Pattern:</strong> ${diag.pattern}</div>
                  </div>
                ` : ''}
                <div class="stability-examples-panel" id="examples-${diag.id}" style="display: none;">
                  <div class="examples-header">
                    <i class="ph ph-lightbulb"></i>
                    Things that typically ${diag.answer.toLowerCase()}:
                  </div>
                  <div class="examples-list">
                    ${diag.examples.map(ex => `
                      <div class="example-item">
                        <div class="example-name">${this._escapeHtml(ex.name)}</div>
                        <div class="example-context">${this._escapeHtml(ex.context)}</div>
                        <div class="example-insight">${this._escapeHtml(ex.insight)}</div>
                      </div>
                    `).join('')}
                  </div>
                  <div class="examples-caveat">
                    <i class="ph ph-warning"></i>
                    These are frame-typical examples. The same phenomenon can behave differently
                    depending on time horizon, observer role, and intervention style.
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          ${selected && this.showFollowUp && !journey.stabilityConfirmed ? `
            <div class="follow-up-question">
              <p class="follow-up-text">
                <i class="ph ph-arrow-bend-down-right"></i>
                <strong>Follow-up:</strong> If you stop touching it, does it ${selected.followUp.answer}?
              </p>
              <div class="follow-up-actions">
                <button class="btn-confirm" data-action="confirm-stability">
                  <i class="ph ph-check"></i> Yes, ${selected.followUp.confirmation}
                </button>
                <button class="btn-reconsider" data-action="reconsider-stability">
                  <i class="ph ph-arrow-counter-clockwise"></i> Let me reconsider
                </button>
              </div>
            </div>
          ` : ''}

          ${selected && (journey.stabilityConfirmed || !this.showFollowUp) ? `
            <div class="stability-consequences">
              <div class="consequence-header">
                <span class="consequence-type consequence-${selected.ontologicalType}">${selected.ontologicalType}</span>
                What this means for usage:
              </div>
              <div class="consequence-grid">
                <div class="consequence-safe">
                  <div class="consequence-label"><i class="ph ph-check-circle"></i> Safe for</div>
                  <ul>${selected.consequences.safe.map(s => `<li>${s}</li>`).join('')}</ul>
                </div>
                ${selected.consequences.risky.length ? `
                  <div class="consequence-risky">
                    <div class="consequence-label"><i class="ph ph-warning"></i> Risky for</div>
                    <ul>${selected.consequences.risky.map(r => `<li>${r}</li>`).join('')}</ul>
                  </div>
                ` : ''}
              </div>
              <div class="consequence-guidance">${selected.consequences.guidance}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Step 3: Application Scope - "Where Does This Apply?"
   */
  _renderStep3ApplicationScope() {
    const journey = this.store.journey;
    const isComplete = journey.scales.size > 0 && journey.temporalPattern;
    const isExpanded = this.expandedStep === 3;

    return `
      <div class="journey-step ${isComplete ? 'complete' : ''} ${isExpanded ? 'expanded' : ''}" data-step="3">
        <div class="step-header" data-action="toggle-step" data-step="3">
          <div class="step-indicator">
            ${isComplete ? '<i class="ph ph-check-circle"></i>' : '<span class="step-num">3</span>'}
          </div>
          <div class="step-title">
            <h3>Where does this apply?</h3>
            ${!isExpanded && journey.scales.size ? `<span class="step-summary">${journey.scales.size} scope${journey.scales.size > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="step-toggle"><i class="ph ph-caret-down"></i></div>
        </div>

        <div class="step-content">
          <div class="field-group">
            <label>This meaning applies at:</label>
            <div class="scale-matrix">
              ${Object.values(ScaleLevel).map(scale => `
                <div class="scale-option ${journey.scales.has(scale.id) ? 'selected' : ''}"
                     data-action="toggle-scale"
                     data-scale="${scale.id}">
                  <div class="scale-checkbox">
                    <i class="ph ${journey.scales.has(scale.id) ? 'ph-check-square' : 'ph-square'}"></i>
                  </div>
                  <div class="scale-text">
                    <div class="scale-label">${scale.label}</div>
                    <div class="scale-desc">${scale.description}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="field-group">
            <label>Does this meaning change over time?</label>
            <div class="temporal-options">
              ${Object.values(TemporalPattern).map(pattern => `
                <div class="temporal-option ${journey.temporalPattern?.id === pattern.id ? 'selected' : ''}"
                     data-action="select-temporal"
                     data-temporal="${pattern.id}">
                  <i class="ph ${pattern.icon}"></i>
                  <span>${pattern.label}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 4: Credibility - "How confident should downstream users be?"
   */
  _renderStep4Credibility() {
    const journey = this.store.journey;
    const isComplete = !!journey.credibility;
    const isExpanded = this.expandedStep === 4;

    return `
      <div class="journey-step ${isComplete ? 'complete' : ''} ${isExpanded ? 'expanded' : ''}" data-step="4">
        <div class="step-header" data-action="toggle-step" data-step="4">
          <div class="step-indicator">
            ${isComplete ? '<i class="ph ph-check-circle"></i>' : '<span class="step-num">4</span>'}
          </div>
          <div class="step-title">
            <h3>How confident should users be?</h3>
            ${!isExpanded && journey.credibility ? `<span class="step-summary">${journey.credibility.label}</span>` : ''}
          </div>
          <div class="step-toggle"><i class="ph ph-caret-down"></i></div>
        </div>

        <div class="step-content">
          <p class="step-prompt">How was this definition established?</p>

          <div class="credibility-options">
            ${Object.values(ProvenanceCredibility).map(cred => `
              <div class="credibility-option ${journey.credibility?.id === cred.id ? 'selected' : ''}"
                   data-action="select-credibility"
                   data-credibility="${cred.id}">
                <div class="credibility-icon"><i class="ph ${cred.icon}"></i></div>
                <div class="credibility-text">
                  <div class="credibility-label">${cred.label}</div>
                  <div class="credibility-desc">${cred.description}</div>
                </div>
                <div class="credibility-weight weight-${cred.weight}">${cred.weight}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 5: URI Linking - Outcome, not requirement
   */
  _renderStep5UriLinking() {
    const journey = this.store.journey;
    const needsUri = journey.origin?.requiresUri;
    const isComplete = journey.linkedUri || journey.uriDeferred;
    const isExpanded = this.expandedStep === 5;

    return `
      <div class="journey-step ${isComplete ? 'complete' : ''} ${isExpanded ? 'expanded' : ''}" data-step="5">
        <div class="step-header" data-action="toggle-step" data-step="5">
          <div class="step-indicator">
            ${isComplete ? '<i class="ph ph-check-circle"></i>' : '<span class="step-num">5</span>'}
          </div>
          <div class="step-title">
            <h3>Link to standard?</h3>
            ${!isExpanded && journey.linkedUri ? `<span class="step-summary linked">Linked</span>` : ''}
            ${!isExpanded && journey.uriDeferred ? `<span class="step-summary deferred">Local</span>` : ''}
          </div>
          <div class="step-toggle"><i class="ph ph-caret-down"></i></div>
        </div>

        <div class="step-content">
          ${needsUri ? `
            <div class="uri-notice notice-info">
              <i class="ph ph-info"></i>
              Since you're borrowing this definition, linking to its source helps with interoperability.
            </div>
          ` : `
            <p class="step-prompt">If this meaning needs to travel outside your system, link it to a shared vocabulary.</p>
          `}

          ${journey.linkedUri ? `
            <div class="uri-selected">
              <div class="uri-selected-info">
                <i class="ph ph-link"></i>
                <div>
                  <div class="uri-name">${this._escapeHtml(journey.linkedUri.name || journey.linkedUri.uri)}</div>
                  <div class="uri-value">${this._escapeHtml(journey.linkedUri.uri)}</div>
                </div>
              </div>
              <button class="btn-clear-uri" data-action="clear-uri"><i class="ph ph-x"></i></button>
            </div>
          ` : `
            <div class="uri-search">
              <input type="text"
                     class="uri-search-input"
                     id="uri-search-input"
                     placeholder="Search for matching standards..." />
              <button class="btn-search" data-action="search-uri"><i class="ph ph-magnifying-glass"></i></button>
            </div>

            <div id="uri-suggestions"></div>

            <div class="uri-options">
              <button class="uri-option ${journey.uriDeferred ? 'selected' : ''}" data-action="defer-uri">
                <i class="ph ph-house"></i>
                <span>Keep local</span>
              </button>
              <button class="uri-option" data-action="manual-uri">
                <i class="ph ph-pencil"></i>
                <span>Enter URI manually</span>
              </button>
            </div>

            ${journey.uriDeferred ? `
              <div class="uri-notice notice-neutral">
                <i class="ph ph-info"></i>
                This is a <strong>local definition</strong>. Comparisons across datasets may diverge.
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;
  }

  /**
   * Optional deepening section (collapsed by default)
   */
  _renderOptionalDeepening() {
    const journey = this.store.journey;

    return `
      <div class="journey-optional">
        <div class="optional-header" data-action="toggle-optional">
          <i class="ph ph-plus-circle"></i>
          <span>Add more context (optional)</span>
        </div>
        <div class="optional-content" style="display: none;">
          <div class="field-row">
            <div class="field-group">
              <label>Geographic Jurisdiction</label>
              <input type="text" class="journey-input" name="jurisdiction"
                     value="${this._escapeHtml(journey.jurisdiction)}"
                     placeholder="e.g., United States" />
            </div>
            <div class="field-group">
              <label>Programs</label>
              <input type="text" class="journey-input" name="programs"
                     value="${journey.programs.join(', ')}"
                     placeholder="e.g., CoC Program, ESG" />
            </div>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label>Effective From</label>
              <input type="date" class="journey-input" name="validFrom"
                     value="${journey.validFrom || ''}" />
            </div>
            <div class="field-group">
              <label>Effective To</label>
              <input type="date" class="journey-input" name="validTo"
                     value="${journey.validTo || ''}" />
            </div>
          </div>
          <div class="field-group">
            <label>Scope Note</label>
            <textarea class="journey-textarea" name="scopeNote" rows="3"
                      placeholder="Edge cases, specific interpretations, caveats...">${this._escapeHtml(journey.scopeNote)}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render completion ring showing 9 aspects status
   */
  _renderCompletionRing(aspects) {
    const completed = aspects.filter(a => a.complete).length;
    const total = aspects.length;
    const percentage = Math.round((completed / total) * 100);

    // SVG ring parameters
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return `
      <div class="completion-ring-container">
        <div class="completion-ring">
          <svg viewBox="0 0 120 120">
            <circle class="ring-bg" cx="60" cy="60" r="${radius}" />
            <circle class="ring-progress" cx="60" cy="60" r="${radius}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${strokeDashoffset}" />
          </svg>
          <div class="ring-center">
            <div class="ring-percent">${percentage}%</div>
            <div class="ring-label">${completed} of ${total}</div>
          </div>
        </div>

        <div class="aspect-list">
          ${aspects.map(a => `
            <div class="aspect-item ${a.complete ? 'complete' : 'incomplete'}">
              <i class="ph ${a.complete ? 'ph-check-circle' : 'ph-circle'}"></i>
              <span>${a.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render risk panel showing safety assessment
   */
  _renderRiskPanel(risk) {
    if (!risk.risks.length && !risk.safeFor.length && !risk.unsafeFor.length) {
      return `
        <div class="risk-panel empty">
          <div class="risk-header">
            <i class="ph ph-shield"></i>
            <span>Safety Assessment</span>
          </div>
          <p class="risk-empty">Complete the stability question to see safety assessment.</p>
        </div>
      `;
    }

    return `
      <div class="risk-panel">
        <div class="risk-header">
          <i class="ph ph-shield"></i>
          <span>Safety Assessment</span>
        </div>

        ${risk.risks.length ? `
          <div class="risk-warnings">
            ${risk.risks.map(r => `
              <div class="risk-item risk-${r.level}">
                <i class="ph ${r.level === 'high' ? 'ph-warning' : 'ph-info'}"></i>
                <span>${r.message}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${risk.safeFor.length ? `
          <div class="risk-safe">
            <div class="risk-label"><i class="ph ph-check"></i> Safe for:</div>
            <div class="risk-tags">
              ${risk.safeFor.map(s => `<span class="tag-safe">${s}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${risk.unsafeFor.length ? `
          <div class="risk-unsafe">
            <div class="risk-label"><i class="ph ph-warning"></i> Not recommended:</div>
            <div class="risk-tags">
              ${risk.unsafeFor.map(s => `<span class="tag-unsafe">${s}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render action buttons
   */
  _renderActions() {
    const canSave = this.store.journey.term && this.store.journey.meaning;

    return `
      <div class="journey-actions">
        <button class="btn btn-secondary" data-action="cancel">
          <i class="ph ph-x"></i> Cancel
        </button>
        <button class="btn btn-primary ${!canSave ? 'disabled' : ''}"
                data-action="save" ${!canSave ? 'disabled' : ''}>
          <i class="ph ph-check"></i> Save Definition
        </button>
      </div>
    `;
  }

  /**
   * Attach all event handlers
   */
  _attachEventHandlers() {
    if (!this.container) return;

    // Step toggles
    this.container.querySelectorAll('[data-action="toggle-step"]').forEach(el => {
      el.addEventListener('click', () => {
        const step = parseInt(el.dataset.step, 10);
        this.expandedStep = this.expandedStep === step ? 0 : step;
        this.render();
      });
    });

    // Text inputs
    this.container.querySelectorAll('input.journey-input, textarea.journey-textarea').forEach(el => {
      el.addEventListener('input', (e) => {
        const name = e.target.name;
        let value = e.target.value;

        // Handle array fields
        if (name === 'programs') {
          value = value.split(',').map(s => s.trim()).filter(Boolean);
        }

        this.store.update(name, value);
      });
    });

    // Origin selection
    this.container.querySelectorAll('[data-action="select-origin"]').forEach(el => {
      el.addEventListener('click', () => {
        const originId = el.dataset.origin;
        const origin = Object.values(DefinitionOrigin).find(o => o.id === originId);
        this.store.update('origin', origin);
        this.render();
      });
    });

    // Stability selection
    this.container.querySelectorAll('[data-action="select-stability"]').forEach(el => {
      el.addEventListener('click', (e) => {
        // Don't trigger selection if clicking on the examples toggle
        if (e.target.closest('[data-action="toggle-examples"]')) return;

        const stabilityId = el.dataset.stability;
        this.store.setStabilityAnswer(stabilityId);
        this.showFollowUp = true;
        this.render();
      });
    });

    // Examples toggle
    this.container.querySelectorAll('[data-action="toggle-examples"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger stability selection
        const stabilityId = el.dataset.stability;
        const panel = this.container.querySelector(`#examples-${stabilityId}`);
        if (panel) {
          const isVisible = panel.style.display !== 'none';
          // Close all other panels first
          this.container.querySelectorAll('.stability-examples-panel').forEach(p => {
            p.style.display = 'none';
          });
          // Toggle this panel
          panel.style.display = isVisible ? 'none' : 'block';
        }
      });
    });

    // Stability confirmation
    this.container.querySelector('[data-action="confirm-stability"]')?.addEventListener('click', () => {
      this.store.confirmStability();
      this.showFollowUp = false;
      this.expandedStep = 3; // Auto-advance to next step
      this.render();
    });

    // Stability reconsider
    this.container.querySelector('[data-action="reconsider-stability"]')?.addEventListener('click', () => {
      this.store.journey.stabilityAnswer = null;
      this.store.derived.stabilityLevel = null;
      this.showFollowUp = false;
      this.render();
    });

    // Scale toggles
    this.container.querySelectorAll('[data-action="toggle-scale"]').forEach(el => {
      el.addEventListener('click', () => {
        const scaleId = el.dataset.scale;
        this.store.toggleScale(scaleId);
        this.render();
      });
    });

    // Temporal selection
    this.container.querySelectorAll('[data-action="select-temporal"]').forEach(el => {
      el.addEventListener('click', () => {
        const temporalId = el.dataset.temporal;
        const pattern = Object.values(TemporalPattern).find(t => t.id === temporalId);
        this.store.update('temporalPattern', pattern);
        this.render();
      });
    });

    // Credibility selection
    this.container.querySelectorAll('[data-action="select-credibility"]').forEach(el => {
      el.addEventListener('click', () => {
        const credId = el.dataset.credibility;
        const cred = Object.values(ProvenanceCredibility).find(c => c.id === credId);
        this.store.update('credibility', cred);
        this.expandedStep = 5; // Auto-advance to URI step
        this.render();
      });
    });

    // URI search
    this.container.querySelector('[data-action="search-uri"]')?.addEventListener('click', () => {
      this._performUriSearch();
    });

    this.container.querySelector('#uri-search-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._performUriSearch();
    });

    // URI defer
    this.container.querySelector('[data-action="defer-uri"]')?.addEventListener('click', () => {
      this.store.deferUri();
      this.render();
    });

    // Clear URI
    this.container.querySelector('[data-action="clear-uri"]')?.addEventListener('click', () => {
      this.store.journey.linkedUri = null;
      this.store.journey.uriDeferred = false;
      this.render();
    });

    // Optional section toggle
    this.container.querySelector('[data-action="toggle-optional"]')?.addEventListener('click', (e) => {
      const content = this.container.querySelector('.optional-content');
      if (content) {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        e.currentTarget.querySelector('i').className = isVisible ? 'ph ph-plus-circle' : 'ph ph-minus-circle';
      }
    });

    // Save/Cancel
    this.container.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      if (this.onSave) {
        const definition = this.store.buildDefinition();
        this.onSave(definition);
      }
    });

    this.container.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      if (this.onCancel) {
        this.onCancel();
      }
    });
  }

  /**
   * Perform URI search
   */
  async _performUriSearch() {
    const input = this.container?.querySelector('#uri-search-input');
    const query = input?.value?.trim();
    if (!query) return;

    const suggestionsContainer = this.container?.querySelector('#uri-suggestions');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = '<div class="uri-loading"><i class="ph ph-spinner"></i> Searching...</div>';

    try {
      let results = [];

      if (this.api) {
        results = await this.api.searchConcepts(query, { limit: 5 });
      } else {
        // Fallback to Wikidata search
        const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&limit=5&format=json&origin=*`);
        const data = await res.json();
        results = (data.search || []).map(e => ({
          uri: `http://www.wikidata.org/entity/${e.id}`,
          name: e.label,
          description: e.description || '',
          source: 'Wikidata'
        }));
      }

      if (results.length === 0) {
        suggestionsContainer.innerHTML = '<div class="uri-no-results">No matching standards found. You can keep this as a local definition.</div>';
        return;
      }

      this.store.setUriSuggestions(results);

      suggestionsContainer.innerHTML = `
        <div class="uri-results">
          ${results.map((r, i) => `
            <div class="uri-result" data-index="${i}">
              <div class="uri-result-name">${this._escapeHtml(r.name)}</div>
              <div class="uri-result-desc">${this._escapeHtml(r.description || '').substring(0, 100)}</div>
              <div class="uri-result-uri">${this._escapeHtml(r.uri)}</div>
            </div>
          `).join('')}
        </div>
      `;

      // Attach click handlers for results
      suggestionsContainer.querySelectorAll('.uri-result').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.index, 10);
          const uri = this.store.journey.uriSuggestions[index];
          if (uri) {
            this.store.selectUri(uri);
            this.render();
          }
        });
      });

    } catch (error) {
      suggestionsContainer.innerHTML = `<div class="uri-error">Search failed: ${error.message}</div>`;
    }
  }

  /**
   * Update display without full re-render
   */
  _updateDisplay() {
    // Update completion ring
    const aspects = this.store.getAspectCompletion();
    const ringContainer = this.container?.querySelector('.completion-ring-container');
    if (ringContainer) {
      ringContainer.outerHTML = this._renderCompletionRing(aspects);
    }

    // Update risk panel
    const risk = this.store.getRiskAssessment();
    const riskPanel = this.container?.querySelector('.risk-panel');
    if (riskPanel) {
      riskPanel.outerHTML = this._renderRiskPanel(risk);
    }
  }

  /**
   * Escape HTML
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Destroy panel
   */
  destroy() {
    this.hide();
  }
}

// ============================================================================
// SECTION IV: Modal Integration
// ============================================================================

/**
 * Show definition journey in a modal
 */
function showDefinitionJourneyModal(options = {}) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'definition-journey-modal-backdrop';
    modal.innerHTML = `
      <div class="definition-journey-modal">
        <div class="modal-header">
          <h2><i class="ph ph-compass"></i> Define: ${options.fieldName || 'New Definition'}</h2>
          <button class="btn-close" title="Close"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" id="definition-journey-container"></div>
      </div>
    `;

    // Inject modal styles
    if (!document.getElementById('definition-journey-modal-styles')) {
      const modalStyles = document.createElement('style');
      modalStyles.id = 'definition-journey-modal-styles';
      modalStyles.textContent = `
        .definition-journey-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: journeyFadeIn 0.2s ease;
        }

        .definition-journey-modal {
          background: var(--bg-primary, #f5f5f5);
          border-radius: 16px;
          width: 95vw;
          max-width: 1100px;
          max-height: 92vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          animation: journeySlideUp 0.3s ease;
        }

        .definition-journey-modal .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: var(--bg-primary, white);
          border-bottom: 1px solid var(--border-color, #e0e0e0);
        }

        .definition-journey-modal .modal-header h2 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .definition-journey-modal .btn-close {
          background: none;
          border: none;
          padding: 10px;
          cursor: pointer;
          color: var(--text-secondary, #5f6368);
          border-radius: 6px;
        }

        .definition-journey-modal .btn-close:hover {
          background: var(--bg-secondary, #f1f3f4);
        }

        .definition-journey-modal .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        @keyframes journeyFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes journeySlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(modalStyles);
    }

    document.body.appendChild(modal);

    const container = modal.querySelector('#definition-journey-container');
    const panel = new DefinitionJourneyPanel({
      container,
      ...options,
      onSave: (definition) => {
        modal.remove();
        resolve(definition);
      },
      onCancel: () => {
        modal.remove();
        resolve(null);
      }
    });

    panel.show(options.initialData);

    // Close handlers
    modal.querySelector('.btn-close')?.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(null);
      }
    });

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        resolve(null);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
}

// ============================================================================
// SECTION V: CSS Styles
// ============================================================================

function injectDefinitionJourneyStyles() {
  if (document.getElementById('definition-journey-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'definition-journey-styles';
  styles.textContent = `
    /* Definition Journey - Main Container */
    .definition-journey {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--text-primary, #202124);
      line-height: 1.6;
      font-size: 14px;
      background: var(--bg-secondary, #f5f5f5);
      min-height: 100%;
    }

    /* Ground Banner */
    .ground-banner {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border-bottom: 1px solid #a5d6a7;
      padding: 14px 24px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .ground-icon {
      width: 36px;
      height: 36px;
      background: #4caf50;
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .ground-label {
      font-size: 0.75rem;
      color: #2e7d32;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .ground-details {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .ground-item strong {
      color: #1b5e20;
    }

    .ground-badge {
      background: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #388e3c;
    }

    .ground-samples {
      margin-top: 6px;
      font-size: 0.85rem;
      color: #558b2f;
    }

    .ground-samples code {
      background: rgba(255,255,255,0.7);
      padding: 1px 6px;
      border-radius: 3px;
      font-family: monospace;
    }

    /* Journey Layout */
    .journey-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 0;
      min-height: calc(100vh - 200px);
    }

    @media (max-width: 900px) {
      .journey-layout {
        grid-template-columns: 1fr;
      }
      .journey-sidebar {
        order: -1;
      }
    }

    .journey-flow {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .journey-sidebar {
      background: white;
      border-left: 1px solid var(--border-color, #e0e0e0);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Journey Steps */
    .journey-step {
      background: white;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .journey-step.complete {
      border-color: #4caf50;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .step-header:hover {
      background: var(--bg-secondary, #f8f9fa);
    }

    .step-indicator {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-indicator .step-num {
      background: var(--primary-100, #e8f0fe);
      color: var(--primary-600, #1a73e8);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-indicator .ph-check-circle {
      color: #4caf50;
      font-size: 1.5rem;
    }

    .step-title {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .step-title h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .step-summary {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
      background: var(--bg-secondary, #f1f3f4);
      padding: 3px 10px;
      border-radius: 4px;
    }

    .step-summary.stability-holon { background: #e8f5e9; color: #2e7d32; }
    .step-summary.stability-protogon { background: #fff3e0; color: #e65100; }
    .step-summary.stability-emanon { background: #fce4ec; color: #c2185b; }
    .step-summary.linked { background: #e3f2fd; color: #1565c0; }
    .step-summary.deferred { background: #f3e5f5; color: #7b1fa2; }

    .step-toggle {
      color: var(--text-muted, #9ca3af);
      transition: transform 0.2s;
    }

    .journey-step.expanded .step-toggle {
      transform: rotate(180deg);
    }

    .step-content {
      display: none;
      padding: 0 20px 20px;
      border-top: 1px solid var(--border-light, #f0f0f0);
    }

    .journey-step.expanded .step-content {
      display: block;
    }

    .step-prompt {
      font-size: 0.95rem;
      color: var(--text-secondary, #5f6368);
      margin: 16px 0;
      line-height: 1.5;
    }

    /* Field Groups */
    .field-group {
      margin-bottom: 18px;
    }

    .field-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #3c4043);
      margin-bottom: 6px;
    }

    .field-group label .required {
      color: #d32f2f;
    }

    .journey-input,
    .journey-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border-color, #dadce0);
      border-radius: 8px;
      font-size: 0.95rem;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .journey-input:focus,
    .journey-textarea:focus {
      outline: none;
      border-color: var(--primary-500, #1a73e8);
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
    }

    .journey-textarea {
      resize: vertical;
      min-height: 60px;
    }

    .field-hint {
      font-size: 0.8rem;
      color: var(--text-muted, #9ca3af);
      margin-top: 4px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Origin Options */
    .origin-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .origin-option {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .origin-option:hover {
      border-color: var(--primary-300, #93c5fd);
      background: var(--primary-50, #eff6ff);
    }

    .origin-option.selected {
      border-color: var(--primary-500, #1a73e8);
      background: var(--primary-50, #eff6ff);
    }

    .origin-icon {
      width: 40px;
      height: 40px;
      background: var(--bg-secondary, #f1f3f4);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: var(--text-secondary, #5f6368);
      flex-shrink: 0;
    }

    .origin-option.selected .origin-icon {
      background: var(--primary-100, #dbeafe);
      color: var(--primary-600, #1a73e8);
    }

    .origin-label {
      font-weight: 600;
      margin-bottom: 2px;
    }

    .origin-desc {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
    }

    /* Diagnostic Question */
    .diagnostic-question {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
      display: flex;
      gap: 16px;
    }

    .question-icon {
      width: 44px;
      height: 44px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      color: #1565c0;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .question-text {
      font-size: 1rem;
      line-height: 1.6;
      color: #0d47a1;
      margin: 0;
    }

    .question-text em {
      font-style: normal;
      font-weight: 600;
      text-decoration: underline;
      text-decoration-style: dotted;
    }

    /* Stability Options */
    .stability-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .stability-option {
      padding: 16px;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .stability-option:hover {
      border-color: var(--primary-300, #93c5fd);
    }

    .stability-option.selected {
      border-color: var(--primary-500, #1a73e8);
      background: var(--primary-50, #eff6ff);
    }

    .stability-main {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
    }

    .stability-answer {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary, #202124);
      width: 100%;
    }

    .stability-desc {
      font-size: 0.9rem;
      color: var(--text-secondary, #5f6368);
      flex: 1;
    }

    .stability-examples-toggle {
      padding: 4px 10px;
      background: transparent;
      border: 1px solid var(--border-color, #dadce0);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-muted, #9ca3af);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }

    .stability-examples-toggle:hover {
      background: var(--bg-secondary, #f8f9fa);
      color: var(--primary-600, #1a73e8);
      border-color: var(--primary-300, #93c5fd);
    }

    .stability-detail {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border-light, #e8eaed);
    }

    .stability-signature {
      font-size: 0.9rem;
      font-style: italic;
      color: var(--primary-700, #1557b0);
      margin-bottom: 6px;
    }

    .stability-example {
      font-size: 0.85rem;
      color: var(--text-muted, #9ca3af);
    }

    .stability-pattern {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed var(--border-light, #e8eaed);
    }

    /* Examples Panel */
    .stability-examples-panel {
      margin-top: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid var(--border-light, #e8eaed);
    }

    .examples-header {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--primary-700, #1557b0);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .examples-header i {
      font-size: 1.1rem;
      color: #f9a825;
    }

    .examples-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .example-item {
      padding: 12px;
      background: white;
      border-radius: 6px;
      border-left: 3px solid var(--primary-400, #60a5fa);
    }

    .example-name {
      font-weight: 600;
      color: var(--text-primary, #202124);
      margin-bottom: 2px;
    }

    .example-context {
      font-size: 0.75rem;
      color: var(--text-muted, #9ca3af);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 6px;
    }

    .example-insight {
      font-size: 0.9rem;
      color: var(--text-secondary, #5f6368);
      line-height: 1.5;
      font-style: italic;
    }

    .examples-caveat {
      margin-top: 14px;
      padding: 10px 12px;
      background: #fff8e1;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #f57c00;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.5;
    }

    .examples-caveat i {
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* Follow-up Question */
    .follow-up-question {
      background: #fff8e1;
      border: 1px solid #ffe082;
      border-radius: 10px;
      padding: 16px;
      margin-top: 16px;
    }

    .follow-up-text {
      margin: 0 0 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.95rem;
    }

    .follow-up-text i {
      color: #f57c00;
      margin-top: 2px;
    }

    .follow-up-actions {
      display: flex;
      gap: 10px;
    }

    .btn-confirm {
      padding: 8px 16px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-confirm:hover {
      background: #43a047;
    }

    .btn-reconsider {
      padding: 8px 16px;
      background: white;
      color: var(--text-secondary, #5f6368);
      border: 1px solid var(--border-color, #dadce0);
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-reconsider:hover {
      background: var(--bg-secondary, #f8f9fa);
    }

    /* Stability Consequences */
    .stability-consequences {
      background: var(--bg-secondary, #f8f9fa);
      border-radius: 10px;
      padding: 16px;
      margin-top: 16px;
    }

    .consequence-header {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .consequence-type {
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .consequence-holon { background: #e8f5e9; color: #2e7d32; }
    .consequence-protogon { background: #fff3e0; color: #e65100; }
    .consequence-emanon { background: #fce4ec; color: #c2185b; }

    .consequence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 12px;
    }

    .consequence-safe, .consequence-risky {
      font-size: 0.9rem;
    }

    .consequence-label {
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .consequence-safe .consequence-label { color: #2e7d32; }
    .consequence-risky .consequence-label { color: #c62828; }

    .consequence-safe ul, .consequence-risky ul {
      margin: 0;
      padding-left: 20px;
      color: var(--text-secondary, #5f6368);
    }

    .consequence-guidance {
      font-size: 0.85rem;
      color: var(--primary-700, #1557b0);
      font-style: italic;
      padding-top: 12px;
      border-top: 1px solid var(--border-light, #e8eaed);
    }

    /* Scale Matrix */
    .scale-matrix {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .scale-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .scale-option:hover {
      background: var(--bg-secondary, #f8f9fa);
    }

    .scale-option.selected {
      background: var(--primary-50, #eff6ff);
      border-color: var(--primary-500, #1a73e8);
    }

    .scale-checkbox {
      font-size: 1.2rem;
      color: var(--text-muted, #9ca3af);
    }

    .scale-option.selected .scale-checkbox {
      color: var(--primary-500, #1a73e8);
    }

    .scale-label {
      font-weight: 600;
      margin-bottom: 2px;
    }

    .scale-desc {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
    }

    /* Temporal Options */
    .temporal-options {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .temporal-option {
      padding: 10px 16px;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      transition: all 0.15s;
    }

    .temporal-option:hover {
      border-color: var(--primary-300, #93c5fd);
    }

    .temporal-option.selected {
      border-color: var(--primary-500, #1a73e8);
      background: var(--primary-50, #eff6ff);
      color: var(--primary-700, #1557b0);
    }

    /* Credibility Options */
    .credibility-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .credibility-option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .credibility-option:hover {
      border-color: var(--primary-300, #93c5fd);
    }

    .credibility-option.selected {
      border-color: var(--primary-500, #1a73e8);
      background: var(--primary-50, #eff6ff);
    }

    .credibility-icon {
      width: 40px;
      height: 40px;
      background: var(--bg-secondary, #f1f3f4);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: var(--text-secondary, #5f6368);
      flex-shrink: 0;
    }

    .credibility-option.selected .credibility-icon {
      background: var(--primary-100, #dbeafe);
      color: var(--primary-600, #1a73e8);
    }

    .credibility-text {
      flex: 1;
    }

    .credibility-label {
      font-weight: 600;
      margin-bottom: 2px;
    }

    .credibility-desc {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
    }

    .credibility-weight {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
    }

    .weight-high { background: #e8f5e9; color: #2e7d32; }
    .weight-medium { background: #fff3e0; color: #e65100; }
    .weight-low { background: #fce4ec; color: #c2185b; }

    /* URI Section */
    .uri-notice {
      padding: 12px 16px;
      border-radius: 8px;
      margin: 12px 0;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.9rem;
    }

    .uri-notice.notice-info {
      background: #e3f2fd;
      color: #1565c0;
    }

    .uri-notice.notice-neutral {
      background: var(--bg-secondary, #f5f5f5);
      color: var(--text-secondary, #5f6368);
    }

    .uri-search {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }

    .uri-search-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--border-color, #dadce0);
      border-radius: 8px;
      font-size: 0.95rem;
    }

    .btn-search {
      padding: 10px 16px;
      background: var(--primary-500, #1a73e8);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-search:hover {
      background: var(--primary-700, #1557b0);
    }

    .uri-results {
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 8px;
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 14px;
    }

    .uri-result {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-light, #f0f0f0);
      cursor: pointer;
      transition: background 0.15s;
    }

    .uri-result:hover {
      background: var(--bg-secondary, #f8f9fa);
    }

    .uri-result:last-child {
      border-bottom: none;
    }

    .uri-result-name {
      font-weight: 600;
      color: var(--primary-600, #1a73e8);
    }

    .uri-result-desc {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
      margin: 2px 0;
    }

    .uri-result-uri {
      font-size: 0.8rem;
      color: var(--text-muted, #9ca3af);
      font-family: monospace;
    }

    .uri-options {
      display: flex;
      gap: 10px;
    }

    .uri-option {
      padding: 10px 16px;
      border: 1px solid var(--border-color, #dadce0);
      border-radius: 8px;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: var(--text-secondary, #5f6368);
    }

    .uri-option:hover {
      background: var(--bg-secondary, #f8f9fa);
    }

    .uri-option.selected {
      background: #f3e5f5;
      border-color: #ba68c8;
      color: #7b1fa2;
    }

    .uri-selected {
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .uri-selected-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .uri-selected-info i {
      font-size: 1.3rem;
      color: #4caf50;
    }

    .uri-name {
      font-weight: 600;
      color: #2e7d32;
    }

    .uri-value {
      font-size: 0.85rem;
      color: var(--text-secondary, #5f6368);
      font-family: monospace;
    }

    .btn-clear-uri {
      background: none;
      border: none;
      color: var(--text-muted, #9ca3af);
      cursor: pointer;
      padding: 6px;
      font-size: 1.1rem;
    }

    .uri-loading, .uri-no-results, .uri-error {
      padding: 20px;
      text-align: center;
      color: var(--text-muted, #9ca3af);
    }

    .uri-loading i {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Optional Section */
    .journey-optional {
      background: white;
      border: 1px dashed var(--border-color, #dadce0);
      border-radius: 12px;
    }

    .optional-header {
      padding: 14px 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary, #5f6368);
      font-size: 0.9rem;
    }

    .optional-header:hover {
      color: var(--primary-600, #1a73e8);
    }

    .optional-content {
      padding: 0 20px 20px;
      border-top: 1px solid var(--border-light, #f0f0f0);
    }

    /* Completion Ring */
    .completion-ring-container {
      text-align: center;
    }

    .completion-ring {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto 16px;
    }

    .completion-ring svg {
      transform: rotate(-90deg);
    }

    .ring-bg {
      fill: none;
      stroke: var(--bg-secondary, #f0f0f0);
      stroke-width: 8;
    }

    .ring-progress {
      fill: none;
      stroke: #4caf50;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .ring-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .ring-percent {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary, #202124);
    }

    .ring-label {
      font-size: 0.75rem;
      color: var(--text-muted, #9ca3af);
    }

    .aspect-list {
      text-align: left;
    }

    .aspect-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 0.85rem;
    }

    .aspect-item.complete {
      color: #4caf50;
    }

    .aspect-item.incomplete {
      color: var(--text-muted, #9ca3af);
    }

    .aspect-item i {
      font-size: 1rem;
    }

    /* Risk Panel */
    .risk-panel {
      background: var(--bg-secondary, #f8f9fa);
      border-radius: 10px;
      padding: 16px;
    }

    .risk-panel.empty {
      text-align: center;
    }

    .risk-header {
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .risk-empty {
      font-size: 0.85rem;
      color: var(--text-muted, #9ca3af);
      margin: 0;
    }

    .risk-warnings {
      margin-bottom: 12px;
    }

    .risk-item {
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.85rem;
    }

    .risk-item.risk-high {
      background: #ffebee;
      color: #c62828;
    }

    .risk-item.risk-medium {
      background: #fff3e0;
      color: #e65100;
    }

    .risk-safe, .risk-unsafe {
      margin-bottom: 12px;
    }

    .risk-label {
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .risk-safe .risk-label { color: #2e7d32; }
    .risk-unsafe .risk-label { color: #c62828; }

    .risk-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag-safe, .tag-unsafe {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .tag-safe {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .tag-unsafe {
      background: #ffebee;
      color: #c62828;
    }

    /* Journey Actions */
    .journey-actions {
      display: flex;
      gap: 10px;
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid var(--border-light, #f0f0f0);
    }

    .btn {
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-primary {
      background: var(--primary-600, #1a73e8);
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background: var(--primary-700, #1557b0);
    }

    .btn-primary.disabled {
      background: var(--bg-tertiary, #e8eaed);
      color: var(--text-muted, #9ca3af);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: var(--text-secondary, #5f6368);
      border: 1px solid var(--border-color, #dadce0);
    }

    .btn-secondary:hover {
      background: var(--bg-secondary, #f8f9fa);
    }
  `;

  document.head.appendChild(styles);
}

// ============================================================================
// SECTION VI: Exports
// ============================================================================

// Export for browser
if (typeof window !== 'undefined') {
  window.EODefinitionJourney = {
    // Core classes
    DefinitionJourneyStore,
    DefinitionJourneyPanel,

    // Constants
    StabilityDiagnostic,
    DefinitionOrigin,
    ScaleLevel,
    TemporalPattern,
    ProvenanceCredibility,

    // Modal
    showDefinitionJourneyModal,

    // Styles
    injectDefinitionJourneyStyles,

    // Config
    DefinitionJourneyConfig
  };

  // Also attach to EO namespace
  window.EO = window.EO || {};
  window.EO.DefinitionJourney = window.EODefinitionJourney;
}

// Export for Node.js/ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DefinitionJourneyStore,
    DefinitionJourneyPanel,
    StabilityDiagnostic,
    DefinitionOrigin,
    ScaleLevel,
    TemporalPattern,
    ProvenanceCredibility,
    showDefinitionJourneyModal,
    injectDefinitionJourneyStyles,
    DefinitionJourneyConfig
  };
}
