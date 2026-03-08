# QSim Studio Web — Design Document

## Overview
Monaco Editor 기반 웹 양자 컴퓨팅 IDE. qsim-studio VS Code Extension의 기능을 웹 서비스로 제공.

## Tech Stack
- **Framework**: Next.js 15 + TypeScript + Tailwind CSS
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Visualization**: SVG circuit renderer (from qsim-studio) + Recharts (results)
- **State Management**: Zustand
- **API**: qsim-cluster REST API
- **Icons**: Lucide React

## Layout — 4-Panel IDE

```
┌─────────────────────────────────────────────────────────────┐
│  QSim Studio    [▶ Run] [⚙ Settings]         [user avatar] │
├────────┬────────────────────────────┬───────────────────────┤
│        │                            │                       │
│  Side  │     Monaco Editor          │   Circuit Viewer      │
│  bar   │     (Code Panel)           │   (Live Preview)      │
│        │                            │                       │
│ ─────  │                            ├───────────────────────┤
│ Files  │                            │                       │
│ Algo   │                            │   Results / Console   │
│ Jobs   │                            │   (Tabs)              │
│ Nodes  │                            │                       │
│        │                            │                       │
├────────┴────────────────────────────┴───────────────────────┤
│  Status Bar: Connected to cluster · 3 nodes · 12 jobs       │
└─────────────────────────────────────────────────────────────┘
```

## Primary View (Landing)
IDE 열면 Monaco가 바로 보이는 게 아니라 **Studio Home**이 먼저 보임:

```
┌──────────────────────────────────────────────────┐
│           ⚛️  QSim Studio                        │
│                                                  │
│   Quick Start                                    │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │ 🔔 Bell  │ │ 👻 GHZ   │ │ 📊 QFT   │       │
│   │  State   │ │  State   │ │          │       │
│   └──────────┘ └──────────┘ └──────────┘       │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │ 🔍 Grover│ │ ⚡ VQE   │ │ 🌀 QAOA  │       │
│   └──────────┘ └──────────┘ └──────────┘       │
│                                                  │
│   Recent Jobs              Cluster Status        │
│   ├─ Bell State (2q) ✅     ● 3 nodes online     │
│   ├─ GHZ 5-qubit  ✅     CPU: 45%              │
│   └─ VQE opt...   🔄     Memory: 62%           │
│                                                  │
│   [+ New File]  [📁 Open]  [📚 Algorithms]      │
└──────────────────────────────────────────────────┘
```

## Sidebar Sections

### 1. Files (파일 탐색기)
- 브라우저 localStorage 기반 가상 파일시스템
- 새 파일, 이름 변경, 삭제
- .py, .qasm 파일 지원

### 2. Algorithms (알고리즘 레지스트리)
- qsim-studio의 12개 템플릿 포팅
- 카드 형태, 클릭 시 에디터에 로드
- 카테고리: Basic, Entanglement, Search, Optimization, Error Correction

### 3. Jobs (작업 목록)
- qsim-cluster에 제출된 job 목록
- 상태 뱃지 (Pending/Running/Completed/Failed)
- 클릭 시 결과 패널에 표시

### 4. Nodes (클러스터 노드)
- 연결된 quantum node 상태
- CPU/Memory 사용률

## Editor Features (Monaco)

### Language Support
- **OpenQASM 3.0**: Syntax highlighting, completion, diagnostics
- **Python (Qiskit)**: Syntax highlighting, Qiskit snippets (13개)
- Custom Monaco language registration

### Toolbar
- ▶ Run Simulation (Ctrl+Enter)
- Language selector (Python / QASM)
- Qubit count, Shot count 설정
- Theme toggle (dark/light)

## Right Panel — Circuit Viewer
- SVG 기반 회로 시각화 (qsim-studio 파서 포팅)
- 코드 변경 시 **실시간 업데이트** (debounced)
- 줌/팬 지원
- Gate legend

## Bottom Panel — Results (Tabs)

### Histogram
- Recharts BarChart
- Measurement outcome 분포

### Probability
- 상태별 확률 분포 테이블 + 차트

### State Vector
- Bloch sphere visualization (stretch goal)
- Amplitude/Phase 테이블

### Console
- 실행 로그, stdout/stderr
- 터미널 스타일 (dark bg)

### Statistics
- Total shots, execution time
- Circuit depth, gate count

## API Integration
- `POST /api/v1/jobs` — 시뮬레이션 제출
- `GET /api/v1/jobs/:id` — 상태 조회
- `GET /api/v1/jobs/:id/result` — 결과
- `GET /api/v1/jobs/:id/logs` — 로그
- `GET /api/v1/cluster/nodes` — 노드 목록
- `GET /api/v1/cluster/metrics` — 메트릭
- WebSocket for real-time job status

## Settings
- API URL + Token (qsim-cluster 연결)
- Editor: font size, tab size, minimap, word wrap
- Theme: dark (default) / light
- Auto-save: on/off

## PR Plan

### PR #1: Project Setup + Layout
- Next.js 15 + TypeScript + Tailwind
- 4-panel resizable layout (react-resizable-panels)
- Sidebar navigation
- Status bar
- Dark theme

### PR #2: Monaco Editor + Language Support
- Monaco Editor integration
- OpenQASM syntax highlighting + completion
- Python/Qiskit syntax + snippets
- File tabs (multi-file)

### PR #3: Studio Home (Primary View)
- Algorithm cards (12 templates)
- Recent jobs widget
- Cluster status widget
- Quick start flow

### PR #4: Circuit Visualization
- SVG circuit renderer (port from qsim-studio)
- QASM parser + Qiskit parser
- Real-time preview on code change
- Zoom/pan controls

### PR #5: Simulation Execution + Results
- API client (qsim-cluster)
- Run button + job submission
- Result tabs: Histogram, Probability, Statistics
- Console output

### PR #6: File Management + Jobs Panel
- Virtual filesystem (localStorage)
- File CRUD operations
- Jobs list with status badges
- Job detail view

### PR #7: Settings + Polish
- Settings modal
- Connection management
- Theme toggle
- Keyboard shortcuts
- Responsive layout
