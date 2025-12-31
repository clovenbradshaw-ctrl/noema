# Plan: Convert Activity Store Actions to EO Operator Compliance

## Current State

The codebase has **two patterns** for recording actions:

### Pattern A: Activity Store Convenience Methods (eo_activity.js)
```javascript
// Current - hides the operator semantics
ActivityPatterns.create(store, 'record', 'rec_123', 'John Doe', context)
ActivityPatterns.updateField(store, 'rec_123', 'name', 'John', 'Jane', context)
ActivityPatterns.delete(store, 'rec_123', 'record', context)
GhostActivities.ghost(entityId, entityType, actor, reason)
```

### Pattern B: Nine Operators invoke() (eo_nine_operators.js)
```javascript
// Clean operator semantics
invoke('INS', { type: 'record', id: 'rec_123' }, context)
invoke('ALT', { type: 'field', id: 'rec_123', field: 'name', previousValue: 'John', newValue: 'Jane' }, context)
invoke('NUL', { type: 'record', id: 'rec_123' }, context)
```

**Problem**: These don't integrate. Activities recorded via Pattern A don't automatically create invocations. The `ActionOperatorMapping` in eo_nine_operators.js is comprehensive but disconnected from the activity store.

---

## Proposed Solution

Unify on a single pattern: **`operator(target, context, [frame])`**

All actions flow through a single entry point that:
1. Creates the operator invocation(s)
2. Records to activity store
3. Optionally bridges to event store

### New Unified API

```javascript
// Single entry point for all operations
const result = await EOAction.execute('update_record', {
  recordId: 'rec_123',
  fieldId: 'name',
  oldValue: 'John',
  newValue: 'Jane',
  userId: 'user_456'
});

// Returns the full operator trace
```

---

## What It Looks Like Stored (API Response)

### Example 1: Create Record

**API Request:**
```http
POST /api/sets/set_abc/records
Content-Type: application/json

{
  "values": { "name": "John Doe", "email": "john@example.com" }
}
```

**Stored Activity (what gets persisted):**
```json
{
  "id": "act_m5x7k2_abc123",
  "type": "activity_atom",

  "operator": "INS",
  "symbol": "⊕",

  "target": {
    "type": "record",
    "id": "rec_m5x7k2_def456",
    "scope": "set_abc",
    "value": { "name": "John Doe", "email": "john@example.com" }
  },

  "context": {
    "epistemic": {
      "agent": "user_789",
      "method": "api_call",
      "source": "POST /api/sets/set_abc/records"
    },
    "semantic": {
      "term": "record_creation",
      "definition": null,
      "jurisdiction": "set_abc"
    },
    "situational": {
      "scale": "single_operation",
      "timeframe": "2025-12-31T10:30:00.000Z",
      "background": null
    }
  },

  "timestamp": "2025-12-31T10:30:00.000Z",
  "logicalClock": 1735643400000,

  "grounding": {
    "operator": "REC",
    "target": { "type": "invocation", "ref": "act_m5x7k2_abc123" }
  }
}
```

**API Response:**
```json
{
  "record": {
    "id": "rec_m5x7k2_def456",
    "values": { "name": "John Doe", "email": "john@example.com" }
  },
  "operation": {
    "operator": "INS",
    "symbol": "⊕",
    "activityId": "act_m5x7k2_abc123",
    "timestamp": "2025-12-31T10:30:00.000Z"
  }
}
```

---

### Example 2: Update Field (ALT operator)

**API Request:**
```http
PATCH /api/records/rec_123/fields/name
Content-Type: application/json

{
  "value": "Jane Doe"
}
```

**Stored Activity:**
```json
{
  "id": "act_m5x8a1_xyz789",
  "type": "activity_atom",

  "operator": "ALT",
  "symbol": "Δ",

  "target": {
    "type": "field",
    "id": "rec_123",
    "field": "name",
    "previousValue": "John Doe",
    "newValue": "Jane Doe"
  },

  "context": {
    "epistemic": {
      "agent": "user_789",
      "method": "inline_edit",
      "source": "PATCH /api/records/rec_123/fields/name"
    },
    "semantic": {
      "term": "value_change",
      "definition": null,
      "jurisdiction": "set_abc"
    },
    "situational": {
      "scale": "single_operation",
      "timeframe": "2025-12-31T10:31:00.000Z",
      "background": null
    }
  },

  "timestamp": "2025-12-31T10:31:00.000Z",
  "logicalClock": 1735643460000,

  "grounding": {
    "operator": "REC",
    "target": { "type": "invocation", "ref": "act_m5x8a1_xyz789" }
  }
}
```

---

### Example 3: Soft Delete (NUL → Ghost)

**API Request:**
```http
DELETE /api/records/rec_123
```

**Stored Activity:**
```json
{
  "id": "act_m5x9b2_ghi012",
  "type": "activity_atom",

  "operator": "NUL",
  "symbol": "∅",

  "target": {
    "type": "record",
    "id": "rec_123",
    "positionType": "entity",
    "value": { "reason": "user_deletion" }
  },

  "context": {
    "epistemic": {
      "agent": "user_789",
      "method": "soft_delete",
      "source": "DELETE /api/records/rec_123"
    },
    "semantic": {
      "term": "ghost_creation",
      "definition": "Entity transitioned to ghost state",
      "jurisdiction": "data_lifecycle"
    },
    "situational": {
      "scale": "single_entity",
      "timeframe": "2025-12-31T10:32:00.000Z",
      "background": "deletion_requested"
    }
  },

  "timestamp": "2025-12-31T10:32:00.000Z",
  "logicalClock": 1735643520000,

  "grounding": {
    "operator": "REC",
    "target": { "type": "invocation", "ref": "act_m5x9b2_ghi012" }
  }
}
```

---

### Example 4: Join Sources (Compound Action → Sequence)

**API Request:**
```http
POST /api/joins
Content-Type: application/json

{
  "leftSourceId": "src_employees",
  "rightSourceId": "src_departments",
  "joinType": "left",
  "conditions": [{ "left": "dept_id", "right": "id" }],
  "conflictPolicy": "LEFT_WINS",
  "resultSetName": "Employee Details"
}
```

**Stored Activity Sequence:**
```json
{
  "id": "seq_m5xa12_jkl345",
  "type": "activity_sequence",
  "name": "Join Sources",
  "timestamp": "2025-12-31T10:33:00.000Z",

  "operators": ["INS", "CON", "DES"],
  "pattern": "join_sources",

  "context": {
    "epistemic": {
      "agent": "user_789",
      "method": "join_creation",
      "source": "POST /api/joins"
    },
    "semantic": {
      "term": "relational_connection",
      "definition": null,
      "jurisdiction": "workspace"
    },
    "situational": {
      "scale": "compound_operation",
      "timeframe": "2025-12-31T10:33:00.000Z",
      "background": null
    }
  },

  "atoms": [
    {
      "id": "act_m5xa12_001",
      "operator": "INS",
      "symbol": "⊕",
      "target": {
        "type": "joined_set",
        "id": "set_m5xa12_mno678",
        "value": {
          "leftSource": "src_employees",
          "rightSource": "src_departments",
          "joinType": "left"
        }
      },
      "sequenceId": "seq_m5xa12_jkl345",
      "sequenceIndex": 0
    },
    {
      "id": "act_m5xa12_002",
      "operator": "CON",
      "symbol": "⊗",
      "target": {
        "type": "join",
        "id": "set_m5xa12_mno678",
        "relatedTo": ["src_employees", "src_departments"],
        "value": {
          "joinType": "left",
          "conditions": [{ "left": "dept_id", "right": "id" }],
          "conflictPolicy": "LEFT_WINS"
        }
      },
      "sequenceId": "seq_m5xa12_jkl345",
      "sequenceIndex": 1,
      "causedBy": "act_m5xa12_001"
    },
    {
      "id": "act_m5xa12_003",
      "operator": "DES",
      "symbol": "⊙",
      "target": {
        "type": "set",
        "id": "set_m5xa12_mno678",
        "newValue": "Employee Details"
      },
      "sequenceId": "seq_m5xa12_jkl345",
      "sequenceIndex": 2,
      "causedBy": "act_m5xa12_002"
    }
  ],

  "atomCount": 3,
  "completed": true,
  "completedAt": "2025-12-31T10:33:00.500Z"
}
```

**API Response:**
```json
{
  "set": {
    "id": "set_m5xa12_mno678",
    "name": "Employee Details",
    "type": "joined_set"
  },
  "operation": {
    "sequenceId": "seq_m5xa12_jkl345",
    "pattern": "join_sources",
    "operators": ["⊕ INS", "⊗ CON", "⊙ DES"],
    "timestamp": "2025-12-31T10:33:00.000Z"
  }
}
```

---

### Example 5: Entity Resolution (SYN operator)

**API Request:**
```http
POST /api/entities/resolve
Content-Type: application/json

{
  "leftEntity": "rec_123",
  "rightEntity": "rec_456",
  "confidence": 0.95,
  "matchMethod": "fuzzy_name_match"
}
```

**Stored Activity:**
```json
{
  "id": "act_m5xb34_pqr901",
  "type": "activity_atom",

  "operator": "SYN",
  "symbol": "≡",

  "target": {
    "type": "entity_resolution",
    "id": "ent_m5xb34_canonical",
    "value": {
      "left": "rec_123",
      "right": "rec_456",
      "confidence": 0.95,
      "method": "fuzzy_name_match"
    }
  },

  "context": {
    "epistemic": {
      "agent": "user_789",
      "method": "fuzzy_name_match",
      "source": "POST /api/entities/resolve"
    },
    "semantic": {
      "term": "same_entity",
      "definition": "These records represent the same real-world entity",
      "jurisdiction": "entity_resolution"
    },
    "situational": {
      "scale": "single_operation",
      "timeframe": "2025-12-31T10:34:00.000Z",
      "background": "deduplication_workflow"
    }
  },

  "timestamp": "2025-12-31T10:34:00.000Z",
  "logicalClock": 1735643640000,

  "grounding": {
    "operator": "REC",
    "target": { "type": "invocation", "ref": "act_m5xb34_pqr901" }
  }
}
```

---

## Implementation Steps

### Step 1: Create Unified Action Executor
Create `eo_action.js` that:
- Takes action type + params
- Looks up in `ActionOperatorMapping`
- Creates operator invocation(s)
- Records to activity store
- Returns unified response

### Step 2: Deprecate Convenience Methods
Mark `ActivityPatterns.*` and `GhostActivities.*` as deprecated.
They should internally call the unified executor.

### Step 3: Add Frame Support
Extend signature to `operator(target, context, frame)` where frame is optional:
```javascript
{
  frame: {
    claim: "This entity was deleted",
    epistemicStatus: "ASSERTED",
    caveats: ["User requested deletion"],
    purpose: "data_cleanup"
  }
}
```

### Step 4: Bridge to Event Store
Add optional auto-bridging where activities create corresponding events with proper grounding chains.

---

## Key Benefits

1. **Single Source of Truth**: All actions go through `ActionOperatorMapping`
2. **Explicit Semantics**: Every action shows its operator(s) - no hidden meaning
3. **Full Provenance**: Context is always recorded, including method and source
4. **Queryable**: Can query activities by operator (`getByOperator('SYN')`)
5. **Auditable**: API responses include operation metadata

---

## Decision Points

1. **Keep convenience methods as thin wrappers?**
   - Pro: Easier migration, familiar API
   - Con: Two ways to do things

2. **Auto-bridge to event store?**
   - Pro: Unified data model
   - Con: More complexity, potential performance impact

3. **Include frame in all activities?**
   - Pro: Richer semantics for MEANT events
   - Con: More verbose, may not always be needed
