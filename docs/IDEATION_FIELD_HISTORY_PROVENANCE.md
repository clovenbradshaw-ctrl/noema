# Field-Level History & Provenance Expansion

## Current State

The system has a solid foundation with:
- **9-element EO provenance schema** (Epistemic, Semantic, Situational triads)
- **Three-level inheritance**: Dataset → Record → Field
- **Activity system** capturing field changes with `previousValue`/`newValue`
- **Event store** with supersession tracking
- **`fieldProvenance`** structure exists but is underutilized

## Ideation: Expanding to Individual Fields

---

## 1. Field Value History Timeline

### Concept
Each field cell maintains a complete version history, showing every change as a navigable timeline.

### UI Interaction
```
┌─────────────────────────────────────────────────┐
│ Aa salary                              ⏱️ 📜    │
│ ┌─────────────────────────────────────────────┐ │
│ │ $95,000                                     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│  History (3 versions)                    ▼      │
│  ├─ $95,000  · Today 2:15pm · Jane (manual)    │
│  ├─ $90,000  · Jan 15 · Import from payroll    │
│  └─ $85,000  · Dec 1 · Initial import          │
│                                                 │
│  [Compare Versions] [Restore Previous]          │
└─────────────────────────────────────────────────┘
```

### Data Model Extension
```javascript
fieldHistory: {
  [recordId]: {
    [fieldId]: [
      {
        value: any,
        timestamp: ISO_TIMESTAMP,
        activityId: string,  // Link to activity atom
        provenance: {...},   // 9-element context for this change
        supersedes: versionId | null
      }
    ]
  }
}
```

### Features
- **Version comparison**: Diff two versions side-by-side
- **Restore capability**: One-click restore with audit trail
- **Change attribution**: Who, when, why, how for each change
- **Timeline scrubbing**: Slider to view field state at any point in time

---

## 2. Field-Level Provenance Popover

### Concept
Clicking a provenance indicator on any field reveals the complete 9-element context for that specific value.

### UI Interaction
```
┌─────────────────────────────────────────────────┐
│ Aa type                                   🔍    │
│ ┌─────────────────────────────────────────────┐ │
│ │ rfp                                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Provenance for "type" ───────────────────┐   │
│ │                                           │   │
│ │ EPISTEMIC                                 │   │
│ │ ○ Agent: Jane Smith (Data Analyst)        │   │
│ │ ○ Method: Manual classification           │   │
│ │ ○ Source: Contract document page 1        │   │
│ │                                           │   │
│ │ SEMANTIC                                  │   │
│ │ ○ Term: Request for Proposal              │   │
│ │ ○ Definition: Formal bidding document     │   │
│ │ ○ Jurisdiction: Federal procurement       │   │
│ │                                           │   │
│ │ SITUATIONAL                               │   │
│ │ ○ Scale: Individual contract              │   │
│ │ ○ Timeframe: FY2024 Q1                    │   │
│ │ ○ Background: Annual procurement cycle    │   │
│ │                                           │   │
│ │ Inherited from: ● Field ○ Record ○ Dataset│   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Inheritance Visualization
- **Filled circle**: Value set at this level
- **Empty circle**: Inherited from parent
- **Dotted circle**: No value (unknown)
- Click any inherited value to see source

---

## 3. Inline Provenance Badges

### Concept
Visual indicators on each field showing provenance status at a glance.

### Badge Types
```
┌──────────────────────────────────────────────────┐
│ Fields with Provenance Badges                    │
│                                                  │
│ Aa id        [M]     M = Manual entry            │
│ contract_2024_0201                               │
│                                                  │
│ Aa type      [I→V]   I→V = Imported, Verified    │
│ rfp                                              │
│                                                  │
│ # salary    [C?]    C? = Computed, Uncertain     │
│ $95,000                                          │
│                                                  │
│ ⏰ hire_date [I]     I = Imported (unverified)   │
│ 2024-01-15                                       │
│                                                  │
│ Badge Legend:                                    │
│ M = Manual  I = Import  C = Computed  A = API    │
│ V = Verified  ? = Uncertain  ! = Conflict        │
└──────────────────────────────────────────────────┘
```

### Badge States
| Badge | Meaning | Color |
|-------|---------|-------|
| `[M]` | Manual entry | Blue |
| `[I]` | Imported | Gray |
| `[C]` | Computed/derived | Purple |
| `[A]` | API/automation | Green |
| `[V]` | Verified | Green check |
| `[?]` | Uncertain | Yellow |
| `[!]` | Conflict | Red |
| `[→]` | Superseded | Strikethrough |

---

## 4. Field Confidence Scores

### Concept
Each field value has an associated confidence score derived from its provenance chain.

### Scoring Factors
```javascript
calculateFieldConfidence(fieldValue) {
  let score = 0;

  // Source reliability (0-30 points)
  score += sourceReliabilityScore(provenance.source);

  // Method rigor (0-25 points)
  score += methodRigorScore(provenance.method);

  // Agent authority (0-20 points)
  score += agentAuthorityScore(provenance.agent);

  // Verification status (0-15 points)
  score += verificationScore(provenance);

  // Temporal freshness (0-10 points)
  score += freshnessScore(provenance.timeframe);

  return score; // 0-100
}
```

### UI Display
```
┌─────────────────────────────────────────────────┐
│ # salary                           95% 🟢       │
│ ┌─────────────────────────────────────────────┐ │
│ │ $95,000                                     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Confidence Breakdown:                           │
│ Source: ████████░░ 28/30 (Payroll system)       │
│ Method: ████████░░ 22/25 (Automated sync)       │
│ Agent:  ██████░░░░ 15/20 (System account)       │
│ Verify: ████████████ 15/15 (Cross-checked)      │
│ Fresh:  ████████████ 10/10 (Updated today)      │
└─────────────────────────────────────────────────┘
```

---

## 5. Field Diff & Merge Interface

### Concept
When the same field has conflicting values from different sources, provide tools to compare and merge.

### UI for Conflicts
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Conflict: salary has 2 values                │
│                                                 │
│ ┌─────────────────┐  ┌─────────────────┐        │
│ │ $95,000         │  │ $92,000         │        │
│ │                 │  │                 │        │
│ │ Source: Payroll │  │ Source: HR DB   │        │
│ │ Updated: Today  │  │ Updated: Jan 10 │        │
│ │ Agent: System   │  │ Agent: Manual   │        │
│ └─────────────────┘  └─────────────────┘        │
│                                                 │
│ Resolution:                                     │
│ ○ Keep left ($95,000)                           │
│ ○ Keep right ($92,000)                          │
│ ○ Manual override: [________]                   │
│ ○ Mark as disputed (keep both)                  │
│                                                 │
│ [Resolve] [Flag for Review]                     │
└─────────────────────────────────────────────────┘
```

---

## 6. Field Audit Log Panel

### Concept
A dedicated panel showing all changes to a specific field across all records.

### UI Layout
```
┌─────────────────────────────────────────────────┐
│ 📋 Audit Log: salary field                      │
│                                                 │
│ Filters: [All Changes ▼] [All Users ▼] [7 days]│
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Today                                       │ │
│ │ ├─ 2:15pm · contract_2024_0201              │ │
│ │ │  $90,000 → $95,000                        │ │
│ │ │  by Jane Smith · "Annual raise"           │ │
│ │ │                                           │ │
│ │ ├─ 11:30am · contract_2024_0156             │ │
│ │ │  NULL → $78,000                           │ │
│ │ │  by Import Bot · "Payroll sync"           │ │
│ │ │                                           │ │
│ │ Yesterday                                   │ │
│ │ ├─ 4:45pm · contract_2024_0189              │ │
│ │ │  $82,000 → $85,000                        │ │
│ │ │  by API · "HR system update"              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Export Log] [Subscribe to Changes]             │
└─────────────────────────────────────────────────┘
```

---

## 7. Provenance Templates for Fields

### Concept
Allow users to create and apply provenance templates to field types, reducing repetitive entry.

### Template Definition
```javascript
provenanceTemplates: {
  "salary-from-payroll": {
    name: "Salary from Payroll System",
    appliesTo: ["salary", "bonus", "compensation"],
    provenance: {
      agent: { value: "Payroll Integration Service" },
      method: { value: "Automated sync from ADP" },
      source: { value: "ADP Workforce Now" },
      jurisdiction: { value: "US Employment Law" },
      scale: { value: "Individual employee" },
      // ... other elements
    }
  }
}
```

### UI for Applying Templates
```
┌─────────────────────────────────────────────────┐
│ Apply Provenance Template                       │
│                                                 │
│ Available Templates:                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ ○ Salary from Payroll System               │ │
│ │   Fills: Agent, Method, Source, Scale      │ │
│ │                                             │ │
│ │ ○ Manual Data Entry                        │ │
│ │   Fills: Agent (current user), Method      │ │
│ │                                             │ │
│ │ ○ Contract Document Extraction             │ │
│ │   Fills: Method, Source, Definition        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Apply to Field] [Apply to All Empty Fields]    │
└─────────────────────────────────────────────────┘
```

---

## 8. Field-Level Annotations & Notes

### Concept
Allow users to add contextual notes to individual field values, separate from the value itself.

### Data Model
```javascript
fieldAnnotations: {
  [recordId]: {
    [fieldId]: [
      {
        id: string,
        type: "note" | "question" | "flag" | "citation",
        content: string,
        author: string,
        timestamp: ISO_TIMESTAMP,
        resolved: boolean,
        provenance: {...}  // Even annotations have provenance!
      }
    ]
  }
}
```

### UI Display
```
┌─────────────────────────────────────────────────┐
│ # salary                              💬 3      │
│ ┌─────────────────────────────────────────────┐ │
│ │ $95,000                                     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Annotations:                                    │
│ ├─ 📌 Note: Includes signing bonus             │
│ │   by Jane · Jan 20                           │
│ │                                              │
│ ├─ ❓ Question: Should this be annualized?     │
│ │   by Bob · Jan 18 · [Resolve]                │
│ │                                              │
│ └─ 📎 Citation: See contract section 4.2       │
│     by Jane · Jan 15                           │
│                                                 │
│ [Add Note] [Add Question] [Add Citation]        │
└─────────────────────────────────────────────────┘
```

---

## 9. Field Lineage Graph

### Concept
Visualize where a field value came from and what it influences (upstream/downstream dependencies).

### Visualization
```
                    ┌─────────────────┐
                    │ base_salary     │
                    │ $85,000         │
                    │ Source: Offer   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ raise_2024  │ │ bonus_rate  │ │ tax_bracket │
    │ +$10,000    │ │ 15%         │ │ 24%         │
    │ Source: HR  │ │ Source: Pol │ │ Source: IRS │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │ total_comp      │
                 │ $109,250        │
                 │ COMPUTED        │
                 └─────────────────┘
```

### Features
- Click any node to see full provenance
- Highlight paths showing how changes propagate
- Detect circular dependencies
- Show stale computed values

---

## 10. Quick Provenance Entry Mode

### Concept
A streamlined interface for rapidly adding provenance to multiple fields.

### UI Flow
```
┌─────────────────────────────────────────────────┐
│ 🚀 Quick Provenance Mode                        │
│                                                 │
│ Currently documenting: contract_2024_0201       │
│                                                 │
│ Set defaults for this session:                  │
│ Agent: [Jane Smith     ▼]                       │
│ Method: [Manual review from document ▼]         │
│ Source: [Contract PDF  ▼]                       │
│                                                 │
│ Click fields to apply provenance:               │
│ ┌─────────────────────────────────────────────┐ │
│ │ ☑ id         - Applied                      │ │
│ │ ☑ type       - Applied                      │ │
│ │ ☐ name       - Click to apply               │ │
│ │ ☐ role       - Click to apply               │ │
│ │ ☑ hire_date  - Applied (custom source)      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Apply to All] [Apply to Selected] [Done]       │
└─────────────────────────────────────────────────┘
```

---

## 11. Field History API

### Concept
Programmatic access to field history for integrations and reports.

### API Endpoints
```javascript
// Get field history for a specific record field
GET /api/records/{recordId}/fields/{fieldId}/history
Response: {
  current: { value, timestamp, provenance },
  versions: [
    { value, timestamp, provenance, activityId }
  ],
  changeCount: number,
  firstValue: { value, timestamp },
  lastChange: { timestamp, agent }
}

// Query field changes across records
GET /api/fields/{fieldId}/changes?since=TIMESTAMP&limit=100
Response: {
  changes: [
    { recordId, previousValue, newValue, timestamp, provenance }
  ]
}

// Bulk provenance update
POST /api/records/{recordId}/fields/provenance
Body: {
  fields: {
    [fieldId]: { provenance: {...} }
  }
}
```

---

## 12. Provenance Completeness Dashboard

### Concept
A dashboard showing provenance coverage across the dataset.

### Metrics
```
┌─────────────────────────────────────────────────┐
│ 📊 Provenance Health Dashboard                  │
│                                                 │
│ Overall Coverage: 67% ████████████░░░░░░       │
│                                                 │
│ By Field:                                       │
│ ├─ id        100% ████████████████████ ✓       │
│ ├─ type       95% ███████████████████░         │
│ ├─ name       82% ████████████████░░░░         │
│ ├─ salary     45% █████████░░░░░░░░░░░ ⚠️      │
│ └─ status     12% ██░░░░░░░░░░░░░░░░░░ 🔴      │
│                                                 │
│ By Provenance Element:                          │
│ ├─ Agent      89% ██████████████████░░         │
│ ├─ Method     76% ███████████████░░░░░         │
│ ├─ Source     71% ██████████████░░░░░░         │
│ ├─ Term       34% ███████░░░░░░░░░░░░░         │
│ └─ Definition 28% ██████░░░░░░░░░░░░░░         │
│                                                 │
│ [Generate Report] [Find Gaps] [Bulk Fill]       │
└─────────────────────────────────────────────────┘
```

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Field Value History Timeline | High | Medium | P1 |
| Field-Level Provenance Popover | High | Low | P1 |
| Inline Provenance Badges | Medium | Low | P2 |
| Quick Provenance Entry Mode | High | Medium | P2 |
| Field Audit Log Panel | Medium | Medium | P2 |
| Provenance Completeness Dashboard | Medium | Low | P2 |
| Field Confidence Scores | Medium | High | P3 |
| Field Diff & Merge | Medium | High | P3 |
| Field Lineage Graph | Low | High | P3 |
| Provenance Templates | Low | Medium | P3 |
| Field History API | Medium | Medium | P3 |
| Field-Level Annotations | Low | Medium | P4 |

---

## Technical Considerations

### Data Storage
- Field history could grow large; consider:
  - Compression for old versions
  - Configurable retention policies
  - Lazy loading for history panels

### Performance
- Index frequently queried paths (recordId + fieldId + timestamp)
- Cache recent history in memory
- Paginate audit logs

### Migration
- Existing records without `fieldProvenance` should gracefully inherit from record/dataset level
- Activity atoms already capture changes; consider backfilling history from activity log

### UI/UX
- Don't overwhelm users with provenance UI by default
- Progressive disclosure: badges → popover → full panel
- Power user mode for bulk provenance entry
