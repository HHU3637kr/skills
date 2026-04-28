# R&K Flow Agent IDE - Figma Design Brief

## Screen

- Name: `R&K Flow / Agent IDE / Desktop`
- Frame: `1920 x 1080`
- Mode: dark IDE workbench
- Core idea: one opened workspace contains many Specs; each Spec is bound to one Git branch and one Agent Team.

## Layout Grid

- Titlebar: `35px` height
- Activity rail: `48px` width
- Explorer: `292px` width
- Editor + canvas: flexible center column, min `560px`
- Right agent chat: `390px` width
- Bottom panel: `206px` height
- Statusbar: `22px` height

Use Figma auto layout for the main workbench:

- Root frame: horizontal rail + main workbench
- Main workbench: vertical titlebar, content, statusbar
- Content: horizontal Explorer, Editor, Chat
- Editor: tabs, breadcrumb, canvas/file viewport, bottom panel

## Design Tokens

### Colors

- `color/workbench`: `#181818`
- `color/activity`: `#181818`
- `color/sidebar`: `#1F1F1F`
- `color/editor`: `#1E1E1E`
- `color/editor-raised`: `#252526`
- `color/panel`: `#202020`
- `color/input`: `#2A2A2A`
- `color/border`: `#2D2D2D`
- `color/border-strong`: `#3C3C3C`
- `color/text`: `#D4D4D4`
- `color/text-strong`: `#F2F2F2`
- `color/text-muted`: `#9A9A9A`
- `color/text-faint`: `#6E6E6E`
- `color/accent-blue`: `#3794FF`
- `color/accent-blue-bg`: `#243A56`
- `color/success`: `#73C991`
- `color/warning`: `#D7BA7D`

### Typography

- UI: Segoe UI / system sans
- Mono: Consolas / SF Mono
- H1 canvas title: `20px / 28px / 650`
- Panel title: `15px / 22px / 700`
- Body: `13px / 20px / 400`
- Utility: `12px / 18px / 400`
- Meta mono: `10-11px / 16px / 400`

### Spacing

- `space/2`: `4`
- `space/3`: `8`
- `space/4`: `12`
- `space/5`: `16`
- `space/6`: `20`
- `space/8`: `28`
- `space/10`: `36`

### Radius

- `radius/control`: `4`
- `radius/bubble`: `8`
- Cards stay square or `<= 4px` to preserve IDE feel.

## Components

### ActivityButton

- Variants: `default`, `active`, `attention`
- Properties: `icon`, `tooltip`, `state`

### FileRow

- Variants: `default`, `active`, `nested`
- Properties: `icon`, `name`, `extension`, `indent`

### SpecRow

- Variants: `default`, `active`
- Properties: `spec_name`, `category_phase`, `git_branch`
- Behavior: selecting a row updates canvas, branch context, Agent Team, Git/PR panel.

### EditorTab

- Variants: `default`, `active`, `modified`
- Properties: `filename`, `kind`

### CanvasToolbar

- Children: `PanPositionChip`, `ResetViewButton`, `SpecBranchBindingChip`, `CheckoutBranchButton`, `PhaseOwnerChip`, `RequestAdvanceButton`, `TeamLeadAdvanceButton`
- The branch binding chip is a core object, not a decorative badge.

### PhaseCard

- Variants: `done`, `current`, `next`
- Properties: `index`, `title`, `description`, `owner`, `state`
- `current` uses blue border and bottom rule.
- `done` uses green-tinted surface.
- `next` is muted but readable.

### AgentCard

- Variants: `default`, `active`
- Properties: `role`, `model`, `summary`, `status`, `private_count`
- Selecting an Agent opens the right-side user-to-agent chat.

### ChatBubble

- Variants: `user`, `agent`
- Properties: `speaker`, `message`
- The right chat is private to the selected Agent. Agent-to-Agent communication belongs in Team Chatroom only.

### BottomTab

- Variants: `default`, `active`
- Tabs: `Problems`, `Output`, `Debug Console`, `Terminal`, `Team Chatroom`, `Model Routing`, `Git / PR`

### GitCard

- Variants: `spec`, `branch`, `pr`
- Properties: `label`, `value`
- Used in the Git / PR panel to make Spec-to-branch binding auditable.

## Interaction Model

### Select Spec

1. Explorer active row changes.
2. Top titlebar branch changes.
3. Canvas binding chip changes.
4. Agent Team cards change.
5. Right chat resets to that Spec's TeamLead.
6. Bottom Git / PR panel changes.

### Pan Canvas

- Drag empty canvas viewport to pan.
- Update `x / y` chip.
- `Reset View` restores origin.

### Advance Workflow

- `TeamLead Advance` increments phase.
- Phase cards update `done/current/next`.
- Spec Explorer phase subtitle updates.
- TeamLead private chat receives confirmation.
- Team Chatroom receives `TeamLead -> AgentTeam` event.

### Request Advance

- Non-TeamLead role sends request to TeamLead.
- Right chat switches to TeamLead.
- Team Chatroom records `<role> -> TeamLead`.

### Checkout Branch

- Current Spec branch becomes the active workbench branch.
- Terminal line shows `git checkout <branch>`.
- TeamLead private chat confirms that future commits belong to the active Spec.

## Design Maturity Notes

- The UI should read as an IDE first, not a dashboard.
- The center canvas is a work surface, not a marketing hero.
- Keep controls dense, predictable, and operational.
- Preserve strong separation between:
  - project files
  - Spec management
  - Agent Team visualization
  - user-to-Agent private chat
  - Agent-to-Agent Team Chatroom
  - Git/PR audit context

## Figma Build Order

1. Create design tokens and text styles.
2. Create primitive components: `ToolbarButton`, `Chip`, `PanelTab`, `ChatBubble`.
3. Create domain components: `SpecRow`, `PhaseCard`, `AgentCard`, `GitCard`.
4. Compose the desktop frame section by section.
5. Validate at `1920 x 1080` and `1440 x 900`.
6. Compare against `spec-workflow-canvas-preview.png` for parity.
