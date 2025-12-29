# Ideation: Robust Set Creation with EO-IR Compliant SQL Merge

## Vision Statement

Transform set creation from a one-time operation into a **living, modifiable query definition** that:
- Persists as an editable specification (not just execution result)
- Maintains complete EO-IR provenance through all modifications
- Enables non-technical users to build complex merges via visual interface
- Supports incremental updates when source data changes

---

## Core Concept: QuerySet

A **QuerySet** is a new first-class entity that represents:

```
QuerySet = Query Definition + Materialized Results + Provenance Chain
```

### Key Properties

| Property | Description |
|----------|-------------|
| **definition** | The declarative query specification (AST or DSL) |
| **materialization** | Cached results from last execution |
| **sources** | References to GIVEN sources involved |
| **derivation** | EO-IR compliant derivation chain |
| **version** | Version number, incremented on modification |
| **schedule** | Optional refresh schedule (on-demand, on-source-change, periodic) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISUAL QUERY BUILDER                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Source  │──│  Join   │──│ Filter  │──│ Select  │──► Preview │
│  │ Picker  │  │ Config  │  │ Builder │  │ Fields  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUERY AST LAYER                            │
│  {                                                               │
│    "type": "query",                                              │
│    "operations": [                                               │
│      { "op": "source", "id": "src_001" },                       │
│      { "op": "join", "type": "left", "right": "src_002",        │
│        "on": [{ "left": "id", "op": "eq", "right": "user_id" }] │
│      },                                                          │
│      { "op": "filter", "conditions": [...] },                   │
│      { "op": "select", "fields": [...] }                        │
│    ],                                                            │
│    "version": 3,                                                 │
│    "createdAt": "...",                                          │
│    "modifiedAt": "..."                                          │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EO-IR COMPLIANCE LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Derivation  │  │   Grounding  │  │    Event     │          │
│  │   Validator  │  │   Generator  │  │   Emitter    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION ENGINE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   SQL Gen    │  │   Executor   │  │  Materializer│          │
│  │   (Optional) │  │   (In-mem)   │  │   (Cache)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Visual Join Builder

### User Flow

1. **Start**: User clicks "Create QuerySet" or "Merge Imports"
2. **Source Selection**: Visual picker showing all available GIVEN sources
3. **Join Canvas**: Drag sources onto canvas, draw connections between fields
4. **Join Configuration**:
   - Select join type (inner/left/right/full)
   - Add multiple join conditions (AND logic)
   - Preview matching records count
5. **Field Selection**: Choose which fields to include in output
6. **Filter Layer**: Add WHERE conditions via form builder
7. **Aggregation (Optional)**: GROUP BY with aggregate functions
8. **Preview & Save**: Real-time preview, then save as QuerySet

### Visual Metaphors

```
┌─────────────────────────────────────────────────────────────┐
│  QuerySet Builder                                    [Save] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐          ┌──────────────┐               │
│   │  Customers   │          │   Orders     │               │
│   ├──────────────┤          ├──────────────┤               │
│   │ • id ●───────────────────● customer_id │               │
│   │ • name       │    LEFT  │ • order_id   │               │
│   │ • email      │    JOIN  │ • amount     │               │
│   │ • created_at │          │ • date       │               │
│   └──────────────┘          └──────────────┘               │
│                                                             │
│   ┌─────────────────────────────────────────────┐          │
│   │ Filters                                      │          │
│   │ ┌─────────┐ ┌────┐ ┌────────────┐ [+ Add]  │          │
│   │ │ amount  │ │ >  │ │ 100        │          │          │
│   │ └─────────┘ └────┘ └────────────┘          │          │
│   └─────────────────────────────────────────────┘          │
│                                                             │
│   Preview: 1,247 records matched                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 2: Query AST Persistence

### AST Schema

```typescript
interface QueryAST {
  id: string;
  version: number;
  operations: Operation[];
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    createdBy: string;
    modifiedAt: string;
    modifiedBy: string;
  };
  provenance: {
    sourceRefs: string[];       // IDs of GIVEN sources
    derivationStrategy: 'seg' | 'con';
    parentVersions: number[];   // Previous versions for diff
  };
}

type Operation =
  | SourceOp
  | JoinOp
  | FilterOp
  | SelectOp
  | GroupOp
  | AggregateOp
  | SortOp
  | LimitOp;

interface SourceOp {
  op: 'source';
  sourceId: string;
  alias?: string;
}

interface JoinOp {
  op: 'join';
  type: 'inner' | 'left' | 'right' | 'full';
  rightSourceId: string;
  rightAlias?: string;
  conditions: JoinCondition[];
}

interface JoinCondition {
  leftField: string;
  operator: 'eq' | 'neq' | 'contains' | 'startsWith' | 'endsWith';
  rightField: string;
}

interface FilterOp {
  op: 'filter';
  conditions: FilterCondition[];
  logic: 'and' | 'or';
}

interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

type FilterOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'isNull' | 'isNotNull' | 'in' | 'notIn'
  | 'between';

interface SelectOp {
  op: 'select';
  fields: FieldSelection[];
}

interface FieldSelection {
  source: string;        // Source alias or 'result'
  field: string;         // Original field name
  alias?: string;        // Output field name
  transform?: Transform; // Optional transformation
}

interface GroupOp {
  op: 'group';
  fields: string[];
}

interface AggregateOp {
  op: 'aggregate';
  aggregations: Aggregation[];
}

interface Aggregation {
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct';
  field?: string;
  alias: string;
}

interface SortOp {
  op: 'sort';
  orders: SortOrder[];
}

interface SortOrder {
  field: string;
  direction: 'asc' | 'desc';
}

interface LimitOp {
  op: 'limit';
  count: number;
  offset?: number;
}
```

---

## Feature 3: Post-Creation Modification

### Modification Capabilities

| Modification | Impact | Provenance Event |
|--------------|--------|------------------|
| Add filter | Non-breaking | `query_filter_added` |
| Remove filter | Potentially breaking | `query_filter_removed` |
| Add join source | Breaking | `query_join_added` |
| Remove join source | Breaking | `query_join_removed` |
| Change join type | Potentially breaking | `query_join_modified` |
| Add field to select | Non-breaking | `query_field_added` |
| Remove field | Breaking | `query_field_removed` |
| Rename field | Non-breaking | `query_field_renamed` |
| Add aggregation | Breaking | `query_aggregation_added` |

### Version Control

```typescript
interface QueryVersion {
  version: number;
  ast: QueryAST;
  timestamp: string;
  actor: string;
  changeType: 'create' | 'modify' | 'fork';
  changeSummary: string;
  parentVersion?: number;
}

interface QuerySetHistory {
  querySetId: string;
  versions: QueryVersion[];
  currentVersion: number;
}
```

### Diff Visualization

```
Version 2 → Version 3

  operations:
    [0] source: customers         (unchanged)
+   [1] join:                     (added)
+         type: left
+         right: orders
+         on: id = customer_id
    [2] filter:                   (modified)
-         amount > 50
+         amount > 100
    [3] select:                   (modified)
          • id                    (unchanged)
          • name                  (unchanged)
+         • order_total          (added)
```

---

## Feature 4: EO-IR Compliance

### Derivation Chain for QuerySets

Every QuerySet operation generates proper EO-IR events:

```typescript
// When QuerySet is created
{
  id: "evt_qs_001",
  epistemicType: "meant",
  category: "queryset_defined",
  timestamp: "2024-01-15T10:30:00Z",
  actor: "user_123",
  payload: {
    querySetId: "qs_001",
    name: "Customer Orders Summary",
    astVersion: 1
  },
  grounding: {
    references: [
      { eventId: "evt_src_customers", kind: "structural" },
      { eventId: "evt_src_orders", kind: "structural" }
    ],
    derivation: {
      strategy: "con",  // CON because it joins multiple sources
      operators: ["SOURCE", "JOIN", "FILTER", "SELECT"],
      inputs: ["src_customers", "src_orders"],
      frozenParams: {
        joinType: "left",
        joinCondition: "id = customer_id",
        filter: "amount > 100"
      }
    }
  },
  frame: {
    claim: "Customers with their order summaries where amount > 100",
    epistemicStatus: "confirmed",
    purpose: "Business reporting"
  }
}

// When QuerySet is modified
{
  id: "evt_qs_002",
  epistemicType: "meant",
  category: "queryset_modified",
  timestamp: "2024-01-16T14:00:00Z",
  actor: "user_123",
  payload: {
    querySetId: "qs_001",
    previousVersion: 1,
    newVersion: 2,
    changeType: "filter_modified",
    changeSummary: "Changed amount filter from >50 to >100"
  },
  grounding: {
    references: [
      { eventId: "evt_qs_001", kind: "epistemic" },  // References previous definition
      { eventId: "evt_src_customers", kind: "structural" },
      { eventId: "evt_src_orders", kind: "structural" }
    ],
    derivation: {
      strategy: "con",
      operators: ["SOURCE", "JOIN", "FILTER", "SELECT"],
      inputs: ["src_customers", "src_orders"],
      frozenParams: {
        joinType: "left",
        joinCondition: "id = customer_id",
        filter: "amount > 100"  // Updated
      }
    }
  }
}
```

### Supersession Tracking

When a QuerySet is modified, we create a supersession relationship:

```typescript
{
  supersedingEventId: "evt_qs_002",
  supersededEventId: "evt_qs_001",
  kind: "refinement",  // Not correction or retraction
  reason: "User modified filter criteria",
  preserves: ["sources", "join_structure"],
  changes: ["filter_condition"]
}
```

---

## Feature 5: Merge Strategies

### Conflict Resolution Policies

When merging sources with potential conflicts:

```typescript
interface MergePolicy {
  // How to handle duplicate keys
  duplicateKeyStrategy:
    | 'keep_first'      // Keep record from first source
    | 'keep_last'       // Keep record from last source
    | 'keep_both'       // Create separate records
    | 'merge_fields'    // Merge non-conflicting fields
    | 'manual';         // Flag for manual resolution

  // How to handle field conflicts when merging
  fieldConflictStrategy:
    | 'prefer_left'     // Left source wins
    | 'prefer_right'    // Right source wins
    | 'prefer_non_null' // Non-null value wins
    | 'prefer_newest'   // Most recent value wins
    | 'concatenate'     // Combine values (text)
    | 'sum'             // Add values (numbers)
    | 'manual';         // Flag for manual resolution

  // How to handle null values
  nullHandling:
    | 'preserve'        // Keep nulls as-is
    | 'coalesce'        // Use first non-null
    | 'default';        // Use default value

  // Field-specific overrides
  fieldOverrides: {
    [fieldName: string]: {
      strategy: 'prefer_left' | 'prefer_right' | 'custom';
      customResolver?: (left: any, right: any) => any;
    };
  };
}
```

### Visual Merge Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  Merge Preview: Customers + CRM_Contacts                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Merge Key: email (exact match)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ■ 1,234 matched (will merge)                            │   │
│  │ □ 156 left only (from Customers)                        │   │
│  │ □ 89 right only (from CRM_Contacts)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Field Conflict Resolution:                                     │
│  ┌──────────────┬─────────────────┬────────────────────────┐   │
│  │ Field        │ Conflicts       │ Strategy               │   │
│  ├──────────────┼─────────────────┼────────────────────────┤   │
│  │ phone        │ 45 records      │ [Prefer CRM ▼]         │   │
│  │ address      │ 128 records     │ [Prefer Non-null ▼]    │   │
│  │ status       │ 12 records      │ [Manual Review ▼]      │   │
│  └──────────────┴─────────────────┴────────────────────────┘   │
│                                                                 │
│  [Preview Merged Data]                    [Apply Merge]         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature 6: SQL Generation & Compatibility

### Bidirectional SQL ↔ AST

```typescript
class QueryCompiler {
  // Visual → AST → SQL
  toSQL(ast: QueryAST): string {
    const parts: string[] = [];

    // Build SELECT clause
    const selectOp = ast.operations.find(op => op.op === 'select');
    if (selectOp) {
      parts.push('SELECT ' + this.compileSelect(selectOp));
    }

    // Build FROM clause with JOINs
    const sourceOps = ast.operations.filter(op =>
      op.op === 'source' || op.op === 'join'
    );
    parts.push(this.compileFrom(sourceOps));

    // Build WHERE clause
    const filterOp = ast.operations.find(op => op.op === 'filter');
    if (filterOp) {
      parts.push('WHERE ' + this.compileFilter(filterOp));
    }

    // ... GROUP BY, HAVING, ORDER BY, LIMIT

    return parts.join('\n');
  }

  // SQL → AST (for advanced users who prefer writing SQL)
  fromSQL(sql: string): QueryAST {
    const parser = new EOSQLParser();
    const parsed = parser.parse(sql);
    return this.convertToAST(parsed);
  }
}
```

### Example Transformation

```
Visual Builder → AST → SQL

Input (Visual):
  Sources: [Customers, Orders]
  Join: LEFT on Customers.id = Orders.customer_id
  Filter: Orders.amount > 100
  Select: Customers.name, Orders.order_id, Orders.amount

Output (SQL):
  SELECT
    Customers.name,
    Orders.order_id,
    Orders.amount
  FROM Customers
  LEFT JOIN Orders ON Customers.id = Orders.customer_id
  WHERE Orders.amount > 100
```

---

## Feature 7: Incremental Updates

### Refresh Strategies

```typescript
interface RefreshConfig {
  strategy:
    | 'manual'           // Only refresh when user requests
    | 'on_source_change' // Auto-refresh when any source changes
    | 'scheduled'        // Refresh on schedule
    | 'streaming';       // Real-time incremental updates

  // For scheduled refresh
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly';
    at?: string;  // e.g., "09:00" for daily
  };

  // For incremental updates
  incrementalConfig?: {
    // Track changes since last refresh
    changeTrackingField?: string;  // e.g., "updated_at"
    // How to apply incremental changes
    mergeStrategy: 'upsert' | 'append' | 'replace';
  };
}
```

### Change Propagation

```
Source A changes → Detect dependent QuerySets → Mark stale → Refresh

[Source: Customers]
        │
        ▼ (change detected)
[QuerySet: Customer_Orders] ← Mark stale
        │
        ▼ (depends on)
[QuerySet: Sales_Report] ← Mark stale
        │
        ▼ (user views)
[View: Sales Dashboard] ← Show "Refresh Available" indicator
```

---

## Implementation Phases

### Phase 1: Query AST Foundation
- Define QueryAST TypeScript interfaces
- Implement AST → SQL compiler
- Implement SQL → AST parser (leverage existing EOSQLParser)
- Create QuerySet store with versioning

### Phase 2: Visual Join Builder
- Build source picker component
- Implement drag-and-drop join canvas
- Create field connection UI
- Add real-time preview

### Phase 3: Filter & Select Builder
- Form-based filter condition builder
- Field selection with aliasing
- Sort and limit configuration
- Aggregation builder (GROUP BY + functions)

### Phase 4: EO-IR Integration
- Derivation event generation
- Supersession tracking for modifications
- Grounding reference management
- Compliance validation

### Phase 5: Modification & Versioning
- Query edit mode
- Version history UI
- Diff visualization
- Fork/branch capability

### Phase 6: Advanced Features
- Merge conflict resolution
- Incremental refresh
- Query composition (QuerySet from QuerySet)
- Template/parameterized queries

---

## Technical Considerations

### Performance
- Lazy evaluation: Don't execute until preview/save
- Query optimization: Reorder operations for efficiency
- Materialization caching: Store results with invalidation
- Pagination: Handle large result sets

### Storage
- AST stored as JSON in existing persistence layer
- Version history as separate collection
- Materialized results in memory with optional persistence

### Validation
- Schema compatibility checks before join
- Type checking for filter conditions
- Circular dependency detection
- Dead code elimination (unreachable operations)

---

## Success Metrics

1. **Usability**: Non-technical users can create joins without SQL knowledge
2. **Flexibility**: 80%+ of current SQL queries expressible via visual builder
3. **Compliance**: 100% EO-IR compliance for all operations
4. **Modification**: Users can modify queries without recreating from scratch
5. **Performance**: Sub-second preview for datasets < 10,000 records

---

*This ideation document outlines a comprehensive vision for robust, modifiable, EO-IR compliant set creation with visual merge/join capabilities.*
