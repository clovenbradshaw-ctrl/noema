# Refactor: Data Import → Set Flow

## Problem Statement

The current "Create Set from Source" approach has fundamental UX issues:

1. **Disconnected from Sources** - The modal appears as a form to fill out, not as a visual transformation of source data into a set
2. **No source integration path** - Users can't easily combine multiple sources or understand how sources relate
3. **Missing provenance visibility** - The GIVEN → MEANT relationship (Source → Set) isn't visualized
4. **One-shot operation** - Creates a set and disconnects from source, no ongoing relationship

## Proposed Solution: Data Pipeline View

Replace the modal-based approach with a **Data Pipeline** paradigm that makes the source → set relationship explicit and visual.

### Core Concept

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DATA PIPELINE                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐            │
│   │   SOURCE    │ ───► │  TRANSFORM  │ ───► │     SET     │            │
│   │  sample.csv │      │  (optional) │      │   "Sample"  │            │
│   │  71 records │      │             │      │             │            │
│   └─────────────┘      └─────────────┘      └─────────────┘            │
│                                                                         │
│   [+ Add Source]       [+ Add Join]                                    │
│                        [+ Add Filter]                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Changes

#### 1. Source Panel (Left Side)

Shows the input source(s) with clear provenance metadata:
- File name, record count
- Import timestamp
- Schema preview
- **+ Add Source** button to combine sources

#### 2. Transform Panel (Middle)

Optional transformation step:
- Join configuration (when multiple sources)
- Filter conditions
- Field selection/renaming
- Visual preview of what transforms are applied

#### 3. Output Panel (Right Side)

The resulting set:
- Name input
- Preview of transformed data
- Record count after transforms
- **Create Set** action

### Visual Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Create Set from Data                                              [×]       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐│
│  │ SOURCES         │     │ PIPELINE        │     │ OUTPUT                  ││
│  │                 │     │                 │     │                         ││
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ Set Name:               ││
│  │ │ sample.csv  │─│────►│ │ All Records │ │────►│ ┌─────────────────────┐ ││
│  │ │ 71 records  │ │     │ └─────────────┘ │     │ │ sample              │ ││
│  │ │ 5 fields    │ │     │                 │     │ └─────────────────────┘ ││
│  │ └─────────────┘ │     │ Transforms:     │     │                         ││
│  │                 │     │ (none)          │     │ 71 records              ││
│  │ [+ Add Source]  │     │                 │     │ 5 fields                ││
│  │                 │     │ [+ Filter]      │     │                         ││
│  │                 │     │ [+ Select]      │     │ ┌───────────────────┐   ││
│  │                 │     │                 │     │ │ Preview           │   ││
│  │                 │     │                 │     │ │ ┌───┬───┬───┐     │   ││
│  │                 │     │                 │     │ │ │...│...│...│     │   ││
│  │                 │     │                 │     │ └───────────────────┘   ││
│  │                 │     │                 │     │                         ││
│  │                 │     │                 │     │ [Cancel] [Create Set]   ││
│  └─────────────────┘     └─────────────────┘     └─────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### When Multiple Sources

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Create Set from Data                                              [×]       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐│
│  │ SOURCES         │     │ PIPELINE        │     │ OUTPUT                  ││
│  │                 │     │                 │     │                         ││
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ Set Name:               ││
│  │ │ customers   │─│──┬─►│ │ LEFT JOIN   │ │────►│ ┌─────────────────────┐ ││
│  │ │ 150 records │ │  │  │ │ on id       │ │     │ │ customer_orders     │ ││
│  │ └─────────────┘ │  │  │ └─────────────┘ │     │ └─────────────────────┘ ││
│  │                 │  │  │       │         │     │                         ││
│  │ ┌─────────────┐ │  │  │       ▼         │     │ 234 records             ││
│  │ │ orders.csv  │─│──┘  │ ┌─────────────┐ │     │ 8 fields                ││
│  │ │ 500 records │ │     │ │ Filter:     │ │     │                         ││
│  │ └─────────────┘ │     │ │ amount>100  │ │     │ ┌───────────────────┐   ││
│  │                 │     │ └─────────────┘ │     │ │ Preview           │   ││
│  │ [+ Add Source]  │     │                 │     │ │ ┌───┬───┬───┐     │   ││
│  │                 │     │ [+ Filter]      │     │ │ │...│...│...│     │   ││
│  │                 │     │ [+ Select]      │     │ └───────────────────┘   ││
│  │                 │     │                 │     │                         ││
│  │                 │     │                 │     │ [Cancel] [Create Set]   ││
│  └─────────────────┘     └─────────────────┘     └─────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: DataPipelineUI Component

Create a new `DataPipelineUI` class that replaces `SetFromSourceUI`:

```javascript
class DataPipelineUI {
  constructor(options) {
    this.sources = [];           // Array of source IDs
    this.transforms = [];        // Array of transform operations
    this.outputConfig = {};      // Set name, field selection
  }

  // Add a source to the pipeline
  addSource(sourceId) { }

  // Add a transform (join, filter, select)
  addTransform(type, config) { }

  // Preview the output
  preview() { }

  // Execute and create the set
  createSet() { }
}
```

### Phase 2: Source Integration

- Source list panel with drag-drop support
- Quick "import and add" flow
- Visual connection lines between sources and transforms

### Phase 3: Transform Operations

Supported transforms:
1. **Join** - Combine sources (inner, left, right, full)
2. **Filter** - Apply conditions (reuse AdvancedFilterBuilder)
3. **Select** - Choose and rename fields
4. **Aggregate** - Group by and aggregate

### Phase 4: Provenance Chain

Each pipeline operation generates proper EO-IR events:
- Source selections → structural references
- Transforms → operator chain in derivation
- Output set → MEANT event with full grounding

## UI Component Structure

```
DataPipelineUI
├── SourcesPanel
│   ├── SourceCard (per source)
│   └── AddSourceButton
├── TransformsPanel
│   ├── TransformCard (per operation)
│   └── AddTransformDropdown
└── OutputPanel
    ├── SetNameInput
    ├── FieldSelector
    ├── PreviewTable
    └── CreateButton
```

## CSS Layout

Use CSS Grid for the 3-column layout:

```css
.data-pipeline {
  display: grid;
  grid-template-columns: 250px 1fr 350px;
  gap: 16px;
  height: 600px;
}

.data-pipeline-sources {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.data-pipeline-transforms {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  position: relative;
}

.data-pipeline-output {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}
```

## Migration Path

1. Keep `SetFromSourceUI` temporarily for backward compatibility
2. Add `DataPipelineUI` as the new default
3. Wire up import flow to use `DataPipelineUI`
4. Deprecate and remove `SetFromSourceUI` after testing

## Success Criteria

1. **Source relationship is clear** - Users can see exactly which sources feed into a set
2. **Source integration is easy** - Adding multiple sources is discoverable and simple
3. **Provenance is visible** - The transformation chain is shown visually
4. **Extensible** - Easy to add new transform types in the future
