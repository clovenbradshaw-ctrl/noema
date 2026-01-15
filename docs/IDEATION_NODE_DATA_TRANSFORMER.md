# Ideation: Node-Based Data Transformer (n8n-Inspired)

**Status**: Ideation
**Date**: January 2026
**Context**: Pivoting from TouchDesigner-inspired dense visual programming to n8n's clean workflow canvas

---

## Why n8n Over TouchDesigner?

After reviewing both approaches, n8n's canvas better fits Noema's data transformation use case:

| Aspect | TouchDesigner | n8n | For Noema |
|--------|---------------|-----|-----------|
| **Mental model** | Signal processing | Workflow automation | Workflow fits better |
| **Density** | Dense, technical | Clean, spacious | Clean is accessible |
| **Node design** | Compact with previews | Card-like with clear actions | Cards match our UI |
| **Categories** | Operator families (TOPs, CHOPs, etc.) | Trigger → Action → Logic | Simpler taxonomy |
| **Debugging** | Watch values flow | Re-run individual steps | Step debugging essential |
| **Data focus** | Numeric/visual signals | JSON/structured data | We're structured data |
| **Escape hatch** | Python scripting | Inline JS/Python | Need code option |
| **AI** | None built-in | AI Assistant + AI nodes | AI is core to us |

**Key insight**: TouchDesigner is optimized for creative/media workflows with continuous signals. n8n is optimized for discrete data transformation workflows. Noema is closer to n8n.

---

## Design Principles (Borrowed from n8n)

### 1. The Dotted Grid Canvas
Clean, minimal background with soft dotted grid. Feels like an infinite workspace, not a technical IDE.

```
┌─────────────────────────────────────────────────────────────────────┐
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│  · · · · · ┌─────────────┐ · · · ┌─────────────┐ · · · · · · · · · │
│  · · · · · │   Orders    │──────▶│   Filter    │ · · · · · · · · · │
│  · · · · · │    150      │ · · · │    42       │ · · · · · · · · · │
│  · · · · · └─────────────┘ · · · └─────────────┘ · · · · · · · · · │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Card-Style Nodes (Not Boxes)
Each node is a clean card with rounded corners, subtle shadow, clear icon. Single focus per node.

```
┌──────────────────────────┐
│  📦  Orders              │  ← Icon + Name (large, clear)
│                          │
│  150 records             │  ← Single key metric
│                          │
│  ○ ─────────────────── ● │  ← Clean connection points
└──────────────────────────┘
```

### 3. Three Node Types (Simplified from Nine Operators)
Instead of exposing all Nine Operators as separate node types, group them:

| Category | Icon | Operators | User Thinking |
|----------|------|-----------|---------------|
| **Source** | 📦 | Set, Lens, Focus | "Where does data come from?" |
| **Transform** | ⚡ | CON, SEG, ALT, DES, NUL | "What do I do to it?" |
| **Output** | 📊 | SYN, visualization | "What's the result?" |

This mirrors n8n's Trigger → Action → Output mental model.

### 4. Right-Rail Inspector (Not Inline)
Configuration happens in a right panel, not in the node itself. Nodes stay clean.

```
┌──────────────────────────────────────────┬───────────────────────┐
│                                          │  Filter               │
│         [Clean canvas with nodes]        │  ─────────────────    │
│                                          │                       │
│                                          │  Field: Status        │
│                                          │  Operator: equals     │
│                                          │  Value: Complete      │
│                                          │                       │
│                                          │  Preview:             │
│                                          │  42 of 150 records    │
│                                          │  ██████░░░░ 28%       │
└──────────────────────────────────────────┴───────────────────────┘
```

### 5. Execution-Aware (n8n's Killer Feature)
Each node shows execution state. Can re-run individual nodes. See actual data at each step.

```
Node states:
  ○ Idle (gray outline)
  ● Running (blue pulse animation)
  ✓ Success (green checkmark)
  ✕ Error (red X with expandable error)

Click any node → See its output data in inspector
Right-click → "Run from here" to re-execute downstream
```

### 6. AI Assistant Integration
Floating AI button (like n8n) that can:
- Suggest next nodes based on your data
- Explain what a workflow does
- Help debug errors
- Generate transformations from natural language

---

## The Data Transformer: Core Concept

### What Is It?
A visual canvas for building data transformation pipelines. You drag data sources, connect transformation steps, and see results—all with the ability to scrub through time (our unique feature from Temporal Pipeline research).

### Name Options
- **Data Flow** - Simple, clear
- **Transform Canvas** - Describes the space
- **Pipeline Builder** - Action-oriented
- **Data Composer** - Creative framing
- **Flow** - Minimal (like n8n's naming)

Recommendation: **Flow** or **Data Flow** - simple, not intimidating.

---

## Node Catalog

### Source Nodes (Where data comes from)

#### 📦 Set
Pull records from any Set in Noema.

```
┌──────────────────────────┐
│  📦  Orders              │
│                          │
│  150 records             │
│  Last updated: 2h ago    │
│                          │
│ ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Set picker (dropdown with search)
- Fields to include (multi-select)
- Sort order (optional)
```

#### 🔍 Lens
Use a saved Lens (filtered/configured view of a Set).

#### 🎯 Focus
Start from a specific record.

#### 📥 Import
Load external data (CSV, JSON, API).

---

### Transform Nodes (What you do to data)

#### ⚡ Filter (SEG operator)
Keep only records matching criteria.

```
┌──────────────────────────┐
│  ⚡  Filter               │
│                          │
│  Status = "Complete"     │
│  42 → kept               │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Field picker
- Operator (=, !=, contains, >, <, between, is empty)
- Value input (with autocomplete from data)
- Add condition (+)
- Logic: AND / OR toggle
```

#### 🔗 Join (CON operator)
Connect to related records.

```
┌──────────────────────────┐
│  🔗  Join                 │
│                          │
│  → Customers             │
│  via customerId          │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Target Set picker
- Join field (auto-detected with manual override)
- Join type: Inner / Left / Right
- Preview: "45 customers matched"
```

#### ✏️ Transform (ALT operator)
Modify field values.

```
┌──────────────────────────┐
│  ✏️  Transform            │
│                          │
│  amount × 1.1            │
│  (10% increase)          │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Field to transform
- Expression builder (visual) or code input
- Preview: before → after for sample records
```

#### 📋 Select (DES operator)
Choose which fields to keep.

```
┌──────────────────────────┐
│  📋  Select               │
│                          │
│  name, email, total      │
│  3 of 12 fields          │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Checkbox list of fields
- Rename fields inline
- Reorder with drag
```

#### 🚫 Handle Nulls (NUL operator)
Deal with missing values.

```
┌──────────────────────────┐
│  🚫  Handle Nulls         │
│                          │
│  Default: 0              │
│  3 nulls handled         │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Strategy: Default value / Remove record / Keep null
- Default value input
- Per-field overrides (advanced)
```

#### 🔀 Branch
Split flow based on conditions (like n8n's IF node).

```
┌──────────────────────────┐
│  🔀  Branch               │
│                          │
│  If amount > 1000        │
│                          │
│● ──────────┬──────────── ●│ True
│            └──────────── ●│ False
└──────────────────────────┘
```

#### 🔄 Loop
Iterate over records (for advanced transformations).

#### 📝 Code
Write JavaScript for custom logic (n8n's escape hatch).

```
┌──────────────────────────┐
│  📝  Code                 │
│                          │
│  // Custom JS            │
│  5 lines                 │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- Monaco editor with syntax highlighting
- Input schema display
- Output preview
- AI: "Explain this code" / "Help me write"
```

---

### Output Nodes (Results & Actions)

#### 📊 Aggregate (SYN operator)
Calculate summaries.

```
┌──────────────────────────┐
│  📊  Aggregate            │
│                          │
│  SUM(amount)             │
│  $12,450                 │
│                          │
│● ─────────────────────────│
└──────────────────────────┘

Config panel:
- Function: SUM, COUNT, AVG, MIN, MAX, FIRST, LAST
- Field to aggregate
- Group by (optional)
```

#### 👁️ Preview
View the current data state (debug point).

#### 💾 Save
Write results to a new Set or update existing.

#### 📤 Export
Download as CSV, JSON, or send to external system.

#### 🤖 AI Action
Send data to AI for analysis, classification, etc.

```
┌──────────────────────────┐
│  🤖  AI Classify          │
│                          │
│  Sentiment analysis      │
│  Processing...           │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Config panel:
- AI model picker
- Prompt template
- Input fields mapping
- Output field name
```

---

## Canvas Interactions

### Adding Nodes
**Method 1**: Click `+` button, opens palette overlay

```
┌─────────────────────────────────────────┐
│  Add a node...            🔍 Search     │
├─────────────────────────────────────────┤
│  📦 Sources                             │
│     Set · Lens · Focus · Import         │
│                                         │
│  ⚡ Transform                            │
│     Filter · Join · Transform · Select  │
│     Handle Nulls · Branch · Code        │
│                                         │
│  📊 Output                              │
│     Aggregate · Preview · Save · Export │
│     AI Action                           │
└─────────────────────────────────────────┘
```

**Method 2**: Drag from node's output port, auto-opens palette
**Method 3**: Press `/` for command palette with search
**Method 4**: Ask AI: "Add a filter for completed orders"

### Connecting Nodes
- Drag from `●` output to `●` input
- Curved bezier lines (subtle, not harsh)
- Connection points glow on hover
- Invalid connections show red with tooltip

### Selecting & Moving
- Click to select (blue border)
- Shift+click for multi-select
- Drag to move
- Cmd+A to select all
- Arrow keys for precise nudging

### Canvas Navigation
- Scroll/pinch to zoom
- Click+drag on empty space to pan
- Double-click to fit all nodes
- Minimap in corner for large flows (toggle)

### Keyboard Shortcuts
```
Space         - Pan mode
Cmd+D         - Duplicate selected
Backspace     - Delete selected
Cmd+Z         - Undo
Cmd+Shift+Z   - Redo
/             - Command palette
?             - Help
R             - Run flow
```

---

## The Timeline (Our Unique Feature)

n8n doesn't have this—it's our differentiator from Temporal Pipeline research.

### Collapsed State (Default)
Timeline is minimized at bottom, just shows current timestamp.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       [Canvas with nodes]                           │
├─────────────────────────────────────────────────────────────────────┤
│  ⏱️ Now                                               [Expand ▲]    │
└─────────────────────────────────────────────────────────────────────┘
```

### Expanded State
Full timeline scrubber with keyframes.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       [Canvas with nodes]                           │
├─────────────────────────────────────────────────────────────────────┤
│  ⏱️ Timeline                                          [Collapse ▼]  │
│                                                                     │
│  ──●────▼────────▼──────────────●────────────────────────────────── │
│   Jan   Import   Import        Now                                  │
│         Feb 3    Apr 12                                             │
│                                                                     │
│  ◀◀  ▶  ▶▶     1x     March 15, 2026 14:32                         │
└─────────────────────────────────────────────────────────────────────┘

Scrub left ← → right to see data at any point in time
All nodes re-evaluate with AS_OF(timestamp)
```

### Timeline Interactions
- Drag handle to scrub
- Click keyframe markers to jump
- Play button animates through time
- Speed selector (0.5x, 1x, 2x, 4x)
- Compare mode: Split view at two timestamps

---

## AI Integration

### Ask AI Button
Floating button on canvas (bottom-right, like n8n).

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                       [Canvas with nodes]                           │
│                                                                     │
│                                                          ┌────────┐ │
│                                                          │ 🤖 Ask │ │
│                                                          └────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Capabilities
1. **Build from description**: "Create a flow that filters orders over $1000 and groups by customer"
2. **Explain flow**: "What does this pipeline do?"
3. **Debug errors**: "Why is this filter returning 0 records?"
4. **Suggest improvements**: "How can I make this more efficient?"
5. **Write code**: "I need to extract the domain from email addresses"

### AI-Suggested Nodes
After each node, AI can suggest likely next steps:

```
┌─────────────────┐
│  📦  Orders     │
│                 │──●──┐
│  150 records    │     │
└─────────────────┘     │
                        ▼
              ┌───────────────────┐
              │  💡 Suggestions   │
              │  • Filter by date │
              │  • Join Customers │
              │  • Aggregate sum  │
              └───────────────────┘
```

---

## Execution Model

### Run Modes
1. **Auto-run**: Pipeline re-evaluates on any change (default for small flows)
2. **Manual run**: Click "Run" button to execute (for expensive operations)
3. **Step-by-step**: Debug mode, advance one node at a time

### Execution States
```
Node border colors:
  Gray     - Not yet run
  Blue     - Currently running (with subtle animation)
  Green    - Successfully completed
  Red      - Error (click to see details)
  Orange   - Stale (upstream changed, needs re-run)
```

### Error Handling
Errors show inline with option to expand:

```
┌──────────────────────────┐
│  ⚡  Filter          ✕   │
│                          │
│  Error: Unknown field    │
│  [Show details]          │
│                          │
│● ─────────────────────── ●│
└──────────────────────────┘

Expanded error panel:
"Field 'statuss' not found. Did you mean 'status'?"
[Fix it] [Ignore] [Ask AI]
```

---

## Data Preview

### Inline Preview (Hover)
Hover over any connection wire to see data flowing through:

```
       ┌────────────────────────┐
       │ 42 records             │
       │ ─────────────────────  │
       │ id    name      amount │
       │ 1     Alice     $120   │
       │ 2     Bob       $340   │
       │ 3     Carol     $890   │
       │ ... 39 more            │
       └────────────────────────┘
             ▲
┌─────────┐  │  ┌─────────┐
│ Filter  │──●──│ Join    │
└─────────┘     └─────────┘
```

### Full Data View
Click node → Inspector shows full data table with:
- Sortable columns
- Search/filter
- Field type indicators
- Null highlighting
- "Open in Grid view" action

---

## Sample Flow: Monthly Sales Report

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Monthly Sales Report                                    [Run ▶] [Save]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·  │
│ · ·┌──────────┐· · ·┌──────────┐· · ·┌──────────┐· · ·┌──────────┐· · · · ·  │
│ · ·│ 📦 Orders│────▶│ ⚡ Filter │────▶│ 🔗 Join  │────▶│ 📋 Select │· · · · ·  │
│ · ·│ 1,247    │· · ·│ 892      │· · ·│ 892      │· · ·│ 3 fields │· · · · ·  │
│ · ·└──────────┘· · ·└──────────┘· · ·└──────────┘· · ·└────┬─────┘· · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·│· · · · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·▼· · · · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · ·┌──────────┐· · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · ·│📊Aggregate│· · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · ·│ $127,450 │· · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · ·└──────────┘· · · · · ·  │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ⏱️ Dec 2025                                                     [Expand ▲] │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Approach

### Phase 1: Core Canvas
- Dotted grid canvas with pan/zoom
- Card-style node component
- Bezier wire connections
- Right-rail inspector
- Basic Source + Filter + Aggregate nodes

### Phase 2: Full Node Library
- All transform nodes
- Output nodes
- Code node with Monaco
- Branch/loop nodes

### Phase 3: Timeline
- Collapsed/expanded timeline
- Temporal scrubbing with AS_OF
- Keyframe detection
- Playback controls

### Phase 4: AI Integration
- Ask AI button
- Node suggestions
- Natural language to flow
- Error explanation

### Phase 5: Polish
- Keyboard shortcuts
- Undo/redo
- Templates library
- Collaboration features

---

## Open Questions

1. **Canvas library**: Build custom vs. React Flow vs. XYFlow?
   - Recommendation: Start with React Flow, customize styling heavily

2. **Node palette**: Left rail (TouchDesigner) vs. overlay (n8n) vs. command palette?
   - Recommendation: Command palette (`/`) primary, overlay secondary

3. **Data preview**: Hover tooltip vs. always-visible mini-preview vs. inspector only?
   - Recommendation: Inspector primary, hover for quick peek

4. **Timeline visibility**: Always visible vs. hidden by default?
   - Recommendation: Collapsed by default, easy toggle

5. **Naming**: "Flow", "Pipeline", "Transform", "Data Flow"?
   - Recommendation: "Flow" - simple, action-oriented

---

## Comparison: Current vs. Proposed

| Aspect | Current (TD-inspired) | Proposed (n8n-inspired) |
|--------|----------------------|------------------------|
| Visual density | Dense, technical | Clean, spacious |
| Node design | Compact boxes with inline config | Cards with external config |
| Categories | 7 operator types | 3 groups: Source/Transform/Output |
| Color coding | Per-operator color | Minimal color, status-based |
| Learning curve | Steep (many concepts) | Gentle (familiar workflow UX) |
| Preview location | Inline in node | Inspector panel + hover |
| AI | None | Integrated assistant |
| Timeline | Always prominent | Collapsed by default |

---

## References

- [n8n Editor UI Documentation](https://docs.n8n.io/courses/level-one/chapter-1/)
- [n8n Node UI Design](https://docs.n8n.io/integrations/creating-nodes/plan/node-ui-design/)
- [React Flow](https://reactflow.dev/) - Canvas library option
- [Temporal Pipeline Design Brief](./DESIGN_BRIEF_TEMPORAL_PIPELINE.md) - Our temporal features
- [TouchDesigner Research](./RESEARCH_TOUCHDESIGNER_DATA_MANIPULATION.md) - Original inspiration

---

## Next Steps

1. Review this ideation with team
2. Prototype basic canvas with React Flow
3. Design detailed node specifications
4. User testing on simple flow creation
5. Iterate based on feedback
