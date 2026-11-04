# UI Design

The following is a general reference for this genre; user requirements, attachments, and the actual scenario take priority.

Applies to static interface mockups, game interfaces, mini-program interfaces, homepage redesigns, and visual design of feature pages. Clickable, runnable products should go through the website or app generation workflow.

**Benchmarks**: mature design systems such as the Apple Human Interface Guidelines and Material Design, plus the proven navigation, information organization, controls, and state design in real products such as Linear, Figma, Notion, and Airbnb.

## Goals

### Solve the real task first
Identify the page's primary users, core tasks, and action paths first; then organize navigation, content, action areas, and feedback states. An interface is not an atmospheric poster — it must let the user see where to start, what they can do, and what state they are currently in.

### Build a reusable interface system
Components of the same kind should share dimensions, spacing, corner radii, icons, text styles, and state rules. Pages may vary in structure, but each module must not reinvent its own set of buttons, cards, and color semantics.

### Use content density close to a real product
Choose appropriate density for desktop, mobile, game HUD, or content pages. Use titles, lists, forms, and status messages of near-real length; do not use overly sparse placeholder content to mask layout problems.

### Keep interface elements editable first
Build static high-fidelity interfaces with the text, shapes, icons, and images of `pptd.md`; image search or generation is mainly for product photos, avatars, illustrations, and background assets — a single full-page generated image must not replace an editable interface. When complex textures or game scenes are needed, process the visual assets first, then overlay controls and text independently.

## Visual references

The following directions draw on how mature design systems comprehensively constrain color roles, typography, components, layout, states, and responsive behavior. They are only meant to help you choose; no brand needs to be replicated. Judge the user's task and device first, then choose one primary direction; a static mockup should present at least the states relevant to the core flow — default, selected, disabled, loading, empty, and error.

The following items are only meant to help you understand what excellent design in this genre can look like. They are not a routing table to be matched item by item, nor is any single one required to be applied in full. Form your own direction from the user's content, then borrow composition, typography, color, imagery, or material treatment from these as needed; reasonable approaches not listed here are also acceptable.

### 01. System-native mobile

**Applies to**: mini-programs, utility apps, content detail pages, forms, settings, and system-level features. Use the familiar skeleton of top navigation, content area, bottom tabs, or a fixed primary action; check control sizes, spacing, and gesture areas against a real phone; color mainly expresses selection, danger, and system feedback, and body text uses a highly legible system font. **States and implementation**: show at least the entry, completion, and error states of one core task, built with editable controls; mobile is not a proportional shrink of a desktop interface.

### 02. Precision productivity workbench

**Applies to**: task management, project collaboration, email, efficiency tools, and professional SaaS. Use fixed sidebars, toolbars, compact lists, and detail panels, carrying high-density information through fine divider lines, alignment, and surface brightness differences; a single accent color is used only for primary actions, selection, and keyboard focus. **States and implementation**: provide list selection, hover, batch operations, empty states, and search results; dark mode must also preserve text hierarchy; do not manufacture a "premium feel" with glow and floating cards.

### 03. Enterprise data and operations console

**Applies to**: data management, monitoring, operations backends, CRM, and complex configuration. Build a unified 4/8-pixel spacing system around filters, tables, charts, batch operations, and detail drawers; right-align numbers; success, warning, error, and info colors each express exactly one semantic. **States and implementation**: show normal data, loading, no results, and exception alerts at the same time; table density should approach real business; do not turn a data page into a set of low-density large cards, and do not hide key actions.

### 04. Developer console

**Applies to**: API platforms, databases, logs, terminals, model platforms, and technical configuration. Use a legible sans-serif for general navigation and explanations, and a monospace font for code, commands, IDs, and logs; establish engineering order through stable zones for code areas, resource trees, configuration panels, and run results; the accent color is used for run states and focus. **States and implementation**: cover at least successful runs, errors, copy feedback, insufficient permissions, and empty logs; do not uniformly style developer interfaces as black-background neon sci-fi screens.

### 05. Collaborative canvas and creation tools

**Applies to**: whiteboards, design tools, workflow orchestration, team creation, and multiplayer editing. The canvas is the main stage; toolbars, layer/object panels, and property bars form a stable outer frame; color distinguishes tools, members, selections, or states; avatars, cursors, comments, and selection boxes must clearly express collaboration relationships. **States and implementation**: show unselected, single-select, multi-select, dragging, comments, and conflict warnings; empty-state illustrations only appear on the entry page; lively does not mean giving every control a different color.

### 06. Imagery-driven consumer interface

**Applies to**: travel, retail, content discovery, lifestyle, portfolio browsing, and booking. Let real high-quality images carry the visual weight; lists and detail pages share stable ratios and cropping; titles, prices, ratings, locations, and tags sit immediately next to their corresponding content; search, filter, favorite, and purchase paths must be understandable on the first screen. **States and implementation**: provide image load failure, sold out/unavailable, favorited, and filter results; text over complex images needs its own backing; do not use repeated placeholder images to mask insufficient assets.

### 07. High-trust transactional services

**Applies to**: payments, banking, assets, bills, insurance, and trading interfaces. Amounts, changes, fees, accounts, and times use fixed alignment and explicit units; the brand color serves only the primary action; rises/falls, success, failure, risk, and pending use semantic states that cannot be confused with one another. **States and implementation**: fully present confirmation, processing, success, failure, and undo/retry; risk information must not be hidden in decorative areas; do not manufacture credibility with fictitious returns and decorative charts.

### 08. Immersive media and game HUD

**Applies to**: music, video, audio tools, game menus, character selection, and combat HUDs. Covers, characters, or scenes serve as the content layer; playback, selection, resources, progress, back, and status prompts form an independent control layer; controls keep fixed positions and high contrast, and visual effects must not pass through text. **States and implementation**: show selected, locked, paused, insufficient resources, and loading; scene images may be searched or generated, but controls and accurate text must be overlaid independently; immersion must not sacrifice operability.

### 09. Branded product homepage

**Applies to**: official-site homepage redesigns, feature launches, product introductions, and sign-up conversion pages. The first screen directly states the product, its audience, and the primary action, using real interfaces, flows, or results as product evidence; one set of typography, brand colors, and graphic motifs runs through the subsequent sections, and sections are distinguished by content rhythm rather than floating cards. **States and implementation**: consider both desktop and mobile reflow; the main navigation and pricing or sign-up entry must be clear; do not produce only a beautiful poster without a product path.

### 10. Retro games and legacy system interfaces

**Applies to**: pixel games, retro web pages, legacy device simulations, and Y2K experiences explicitly requested by the user. Choose one specific era's bitmap fonts, windows, panels, icons, shadows, and signal-color rules; navigation, warnings, forward movement, and selection keep fixed feedback; high-density modules still revolve around one primary task. **States and implementation**: provide era-appropriate states such as button press, window activation, error dialogs, and loading; accurate text stays editable; do not mix multiple eras, and do not use random old windows and noise in place of system design.

## Prohibited items
1. Do not describe a static presentation mockup as a product that can already be clicked, run, or has completed development.
2. Do not disguise decorative elements as real controls, or leave buttons, input fields, and states without functional meaning.
3. Do not pile on cards, gradients, glowing borders, and irrelevant charts by default just to appear rich.
4. Do not sacrifice usability with low-contrast text, undersized font sizes, and inconsistent component states.
