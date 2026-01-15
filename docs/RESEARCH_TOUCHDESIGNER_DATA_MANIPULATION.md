# TouchDesigner Research: Data Manipulation & Layout for Compositions

Research into TouchDesigner's capabilities for manipulating data and laying it out for visual compositions.

## Overview

TouchDesigner is a node-based visual programming environment where **all data is fundamentally numeric**. 3D geometry is lists of XYZ positions, CHOPs are signals and numbers, and even pixels inside TOPs are just numbers with different ranges (8-bit or 32-bit). This unified numeric foundation allows fluid conversion between operator families.

## Operator Families

TouchDesigner organizes operators into families, each representing data differently:

| Family | Purpose | Data Type |
|--------|---------|-----------|
| **TOPs** (Texture Operators) | Image/video processing, compositing | 2D pixel data |
| **CHOPs** (Channel Operators) | Motion, audio, control signals | Time-based numeric channels |
| **SOPs** (Surface Operators) | 3D geometry manipulation | Point/primitive data |
| **DATs** (Data Operators) | Text, tables, scripts | String/table data |
| **COMPs** (Component Operators) | Network organization, UI | Container structures |
| **POPs** (Point Operators) | GPU-based 3D data (new in 2025) | Point cloud/particle data |

**Data flows left-to-right**: inputs on left, outputs on right.

---

## Data Manipulation Techniques

### 1. Table DAT - Structured Data

The **Table DAT** is the primary tool for organizing structured data:

- **Manual Editing**: Right-click to add rows/columns, Tab to navigate cells
- **Procedural Filling**: Fill Type options include Set Size, Fill by Column, Fill by Row
- **External Data**: Load `.csv`, `.tsv`, or `.dat` files; supports HTTP URLs for web data
- **Python Access**: `op('table1')[row, col].val` returns cell string value

**Locking for modification**:
```python
table.lock = 1  # Lock to enable editing
table.lock = 0  # Unlock (reloads from source file)
```

### 2. Data Conversion Operators

Convert between operator families seamlessly:

| Conversion | Operator | Use Case |
|------------|----------|----------|
| CHOP → SOP | `CHOP to SOP` | Create 3D geometry from channel data |
| SOP → CHOP | `SOP to CHOP` | Extract point attributes as channels |
| CHOP → DAT | `CHOP to DAT` | Convert channels to table format |
| DAT → CHOP | `DAT to CHOP` | Convert table rows to channels |
| TOP → CHOP | `TOP to CHOP` | Sample pixel values as channels |
| CHOP → TOP | `CHOP to TOP` | Visualize channel data as image |

### 3. CHOP to SOP Workflow

The `CHOP to SOP` operator converts channel data into 3D geometry:

- **Input Required**: This is a Filter operator (needs geometry input)
- **Channel Mapping**: Three channels map to XYZ positions
- **Attribute Scope**: Specify which attributes to modify
- **Group Parameter**: Optionally modify only specific point groups

---

## Layout & Compositing (TOPs)

### Layout TOP

Used for arranging multiple visual sources in a composition.

### Tile TOP

Creates repeating patterns from input images:

- **Repeat X/Y**: Number of tiles in each direction
- **Flip/Reflect**: Mirror tiles in X or Y
- **Overlap U/V**: Blend edges between tiles
- **Extend Modes**: Hold, Zero, Repeat, or Mirror at edges

### Composite TOP

Multi-input compositing with layer operations:

- **Fixed Layer**: Designate which input is the base layer
- **Pre-Fit Overlay**: Fill, Fit Horizontal, Fit Vertical options
- **Translate Step**: Create tile blocks with adjustable sequences
- **Operation Types**: Over, Under, Add, Multiply, etc.

### Layer Mix TOP (New in 2025)

Per-layer compositing controls:
- Crop, scale, rotation, translation, pivot
- Opacity, brightness, levels
- Independent composite operation per layer

---

## Instancing for Data-Driven Visualization

**Instancing** efficiently renders multiple copies of geometry using a single source model.

### Key Concepts

1. **Geometry COMP**: The building block for instancing setups
2. **Instance Sources**: CHOP samples, DAT table rows, TOP pixels, or SOP points
3. **Per-Instance Attributes**: Position, scale, rotation, color

### Instance Data Sources

| Source | Channels/References |
|--------|---------------------|
| CHOP | `p(0)`, `p(1)`, `p(2)` |
| TOP | R, G, B, A channels |
| DAT | Table row values |
| SOP | Point attributes |

### Workflow

1. Create Geometry COMP with source geometry
2. Enable instancing in Geometry COMP parameters
3. Connect data source (CHOP, DAT, TOP, or SOP)
4. Map attributes to instance properties (tx/ty/tz, sx/sy/sz, rx/ry/rz)

---

## Point Operators (POPs) - New in 2025

POPs are a **GPU-based operator family** for high-performance 3D data manipulation.

### Key Features

- **GPU-Resident Computing**: All calculations stay on GPU, avoiding CPU round-trips
- **Point Attributes**: Position, normal, color, plus custom user-defined attributes
- **No Shader Coding Required**: Modern procedural tools without GLSL
- **Millions of Points**: Real-time performance for massive point clouds/particles

### Use Cases

- Particle systems with millions of points
- Real-time complex geometry animation
- Massive data manipulation
- DMX/LED/laser output workflows

### Integration

- Render directly via **Render TOP**
- Export to CHOPs for DMX, lasers, external systems
- Seamless interop with TOPs (both GPU-based)

### System Requirements

- **Minimum**: 4GB GPU memory
- **Recommended**: 8GB+ GPU memory for POPs
- **Supported**: NVIDIA 50-series (Blackwell) GPUs

---

## Python Scripting for Automation

### Execute DATs

Event-driven scripting via callback DATs:

| DAT Type | Trigger |
|----------|---------|
| **DAT Execute** | Changes in DAT table content |
| **OP Execute** | Operator changes (name, children, wiring) |
| **Panel Execute** | UI panel interactions |
| **Parameter Execute** | Parameter value changes |
| **Execute** | System events (startup, save, operator creation) |

### Execute DAT Callbacks

```python
def onFrameStart():
    # Called at start of every frame
    pass

def onFrameEnd():
    # Called at end of every frame
    pass

def onDeviceChange():
    # Called when devices connect/disconnect
    pass

def onTableChange(dat):
    # Called when table contents change (2025.30000+)
    pass
```

### Script Operators

Create custom operator behavior with Script OPs:
- **Script CHOP**: Generate custom channel data
- **Script SOP**: Generate custom geometry
- **onCook callback**: Define behavior when operator cooks

### Performance Note

Native C++/GLSL operators generally outperform Python for signal processing. Use Python for:
- Complex logic that's hard to express as nodes
- External library integration
- Automation and workflow tools

---

## Data-Driven Visualization Patterns

### Pattern 1: Table to Instanced Geometry

```
Table DAT → DAT to CHOP → Geometry COMP (instancing)
```

### Pattern 2: Audio-Reactive Visuals

```
Audio Device In CHOP → Math CHOP → CHOP to SOP → Geometry COMP
```

### Pattern 3: Procedural Layout

```
Noise CHOP → CHOP to TOP → Composite TOP → Layout composition
```

### Pattern 4: Data Import Pipeline

```
Web DAT (fetch CSV) → Table DAT → Insert DAT (headers) → Instancing
```

---

## Relevant Concepts for Noema Integration

TouchDesigner's paradigms that could inform Noema's data visualization:

1. **Node-based Data Flow**: Left-to-right data transformation pipelines
2. **Operator Families**: Specialized representations for different data types
3. **Instancing**: Efficient rendering of data-driven visual elements
4. **Table Structure**: Rows/columns with typed cells for structured data
5. **GPU Acceleration**: Keeping computation on GPU for performance
6. **Python Scripting**: Automation and custom behavior hooks

---

## Sources

### Official Documentation
- [TouchDesigner DAT Documentation](https://docs.derivative.ca/DAT)
- [Table DAT Documentation](https://docs.derivative.ca/Table_DAT)
- [Layout TOP Documentation](https://docs.derivative.ca/Layout_TOP)
- [Tile TOP Documentation](https://docs.derivative.ca/Tile_TOP)
- [Composite TOP Documentation](https://docs.derivative.ca/Composite_TOP)
- [CHOP to SOP Documentation](https://docs.derivative.ca/CHOP_to_SOP)
- [POP Documentation](https://docs.derivative.ca/POP)

### Tutorials & Learning Resources
- [TouchDesigner Tutorial for Beginners (2025)](https://stevezafeiriou.com/touchdesigner-tutorial-for-beginners/)
- [TouchDesigner's Data Model](https://interactiveimmersive.io/blog/touchdesigner-lessons/touchdesigners-data-model/)
- [The Table DAT Operator](https://interactiveimmersive.io/blog/touchdesigner-operators-tricks/the-table-dat-operator-in-touchdesigner/)
- [Instancing: A Primer](https://interactiveimmersive.io/blog/touchdesigner-lessons/instancing-a-primer-with-touchdesigner/)
- [What's New in 2025 Release](https://interactiveimmersive.io/blog/touchdesigner-resources/whats-new-in-the-2025-touchdesigner-release/)
- [POPs FAQ](https://interactiveimmersive.io/blog/touchdesigner-3d/pops-in-touchdesigner-faq/)
- [Introduction to Python Tutorial](https://derivative.ca/UserGuide/Introduction_to_Python_Tutorial)
- [Python Cheat Sheet for TouchDesigner](https://interactiveimmersive.io/blog/python/python-cheat-sheet-for-touchdesigner-developers/)

### Workshops & Courses
- [The Node Institute: TouchDesigner Beginner Class](https://thenodeinstitute.org/courses/ss25-touchdesigner-beginners-class/)
- [Mastering POPs Workshop](https://derivative.ca/workshop/mastering-pops-future-3d-data-manipulation-touchdesigner/70474)
- [TouchDesigner for Data Visualization](https://derivative.ca/workshop/touchdesigner-data-visualisation)

### Community Resources
- [2025 Official Update](https://derivative.ca/community-post/2025-official-update/73153)
- [POPs: A New Operator Family](https://derivative.ca/community-post/pops-new-operator-family-touchdesigner/69468)
- [Simon Alexander-Adams: Instancing Geometry](https://www.simonaa.media/tutorials/instancing)
