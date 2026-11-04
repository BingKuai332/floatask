# Diagrams and Structures

The following is a general reference for this genre; user requirements, attachments, and the actual scenario take precedence.

Applies to flowcharts, architecture diagrams, mechanism diagrams, roadmaps, system relationship diagrams, and structural explanatory diagrams.

**Benchmarks**: mechanism and structural diagrams in publications such as Nature and Science, system schematics in technical documentation from the likes of Stripe and IBM, and process, section, and relationship diagrams from outstanding architecture, engineering, transportation, and service design projects.

## Goals

### Ensure semantic correctness first
Confirm objects, hierarchies, directions, sequences, causality, containment, and correspondence relationships before choosing a structure such as a flow, network, matrix, section, timeline, or spatial route. A diagram is first and foremost an explanatory tool; visual simplicity must not come at the cost of rewriting facts.

### Establish a stable visual encoding
Each line type, arrow, color, shape, and positional relationship expresses only one meaning, explained through a legend or labels. Primary paths and secondary relationships must be clearly differentiated; avoid giving every node the same visual weight.

### Handle attachments and specialized content faithfully
When the user provides sketches, floor plans, annotations, or connection examples, preserve their topology and spatial relationships, optimizing only alignment, styling, and readability. For medical, scientific, and engineering content, never improvise structures you are unsure about; express them based on the attachments or reliable sources.

### Use editable graphics as the main body
Build editable diagrams primarily with the shapes, text, connectors, and custom graphics in `pptd.md`. Complex coordinates, network layouts, curves, or data-driven geometry may be computed or drawn with Python assistance; searched or generated images are only for local objects that require a realistic appearance and cannot stand in for the relationships themselves.

## Visual references

The directions below are categorized by "the relationship that needs explaining," not by decorative style. First confirm whether the objects are related by sequence, causality, containment, correspondence, spatial arrangement, or network, then choose one primary structure; color, icons, and illustration can only reinforce that structure — they must not introduce a separate set of meanings.

The following entries serve only to help understand what good design in this genre can look like. They are not a routing table to be matched item by item, nor is any single one required to be applied in full. Form your own direction from the user's content, then borrow composition, typography, color, imagery, or material treatments from these entries as needed; reasonable approaches not listed here are also acceptable.

### 01. Hand-drawn cyclical mechanism diagram

**Applies to**: biological life cycles, circular economies, feedback loops, and repeatedly iterated processes. Arrange 4–7 key stages along a circular or elliptical path, keep arrows in a single direction, and place only the cycle's theme or shared environment at the center; light watercolor, pencil lines, or natural textures may reduce the textbook feel, but the subject, action, and outcome of each step must be clear. **Production**: lock down the topology first with editable nodes and arrows, then add local illustrations in a consistent style; never add or remove stages of a specialized process to suit the composition.

### 02. Precise layered architecture diagram

**Applies to**: software architecture, platform capabilities, organizational systems, and technology stacks. Build horizontal layer bands following real tiers such as infrastructure, platform, services, and applications; run a single high-contrast path through the main data flows or call chains. Node size corresponds to hierarchy — do not enlarge nodes arbitrarily when it does not correspond to business importance. **Production**: use the grids, shapes, and orthogonal connectors in `pptd.md` to keep everything editable, limited to one primary color plus a few neutrals; do not turn every component into a standalone card, and do not let connectors cross through text.

### 03. Section and working-principle diagram

**Applies to**: machine structures, human-body mechanisms, architectural spaces, product internals, and physical principles. Center the diagram on one clear side-view or cutaway subject, distinguish parts or media by color, explain functions with numbered callouts and short notes, and show key details through local magnifications; the inlet, transformation process, and outlet should form a continuous viewing path. **Production**: the main subject may be redrawn from reference photos or generated, but its contours, proportions, and specialized structures must be verified; make labels, cutting-plane lines, and arrows as independent elements, avoiding text baked directly into the image.

### 04. Comparative structure diagram

**Applies to**: comparisons of two mechanisms, schemes, states, product structures, or conceptual models. Have both sides share the same baseline, scale, viewing angle, and label order, highlighting only the parts that genuinely differ; use neutral colors for common items and one stable set of accent colors for differences, adding a short conclusion axis in the middle when necessary. **Production**: establish the mirrored or side-by-side skeleton first, then check the correspondence item by item; do not use differences in size, angle, or decorative intensity to fabricate superiority or inferiority that does not exist.

### 05. Milestone timeline roadmap

**Applies to**: project plans, historical evolution, curriculum paths, and product development. The timeline carries only sequence and phases; node size or color separately expresses importance and status. For long spans, divide into phases first, then place key events within each phase — avoid spreading all dates at equal intervals. **Production**: build short routes as polylines or a single axis in `pptd.md`; for complex schedules, Python may compute positions. Keep the necessary parts of each event's three information types — date, action, and outcome — without stacking long paragraphs of body text.

### 06. Relationship network and ecosystem diagram

**Applies to**: stakeholders, organizational collaboration, knowledge networks, industry ecosystems, and system dependencies. First determine whether the topology is hub-centric, clustered, or chain-based; if node distance expresses relationship strength, it must do so consistently. Distinguish roles by node shape, relationships by line type, and groups by color, keeping at most three encoding channels. **Production**: when there are many nodes, use Python to assist the layout, then return to editable text and legends to finish; do not add semantically empty links just for a "network feel."

### 07. Spatial map and action route

**Applies to**: city walks, venue guides, exhibition circulation, outdoor routes, and floor plans. The map first retains necessary references such as roads, water bodies, buildings, or terrain, then builds an action layer with a high-contrast route, start and end points, directions, and distances; landmark illustrations mark only key nodes rather than spreading evenly across the whole map. **Production**: base real routes on maps or user attachments, simplifying geometry when necessary without changing relative orientation; legends, scale, timing, and safety notes must be clear — do not pass off a decorative map as an accurate route.

### 08. Decision branches and service flows

**Applies to**: business processes, user journeys, approval paths, troubleshooting, and selection logic. Keep the main flow left-to-right or top-to-bottom, use a uniform question format for condition nodes, label branch conditions directly beside the lines, and render exception paths in a secondary color that must still be traceable to an endpoint; add swimlanes for cross-role processes. **Production**: first verify that every entry has an exit and every branch closes, then apply styling; do not use freeform curves and decorative icons to conceal logical gaps.

### 09. Multi-panel scientific figure

**Applies to**: paper main figures, experimental results, microscopy images, quantitative analyses, and graphical abstracts. Organize panels A/B/C and so on in reading order, letting experimental schematics, raw images, statistical charts, and conclusion graphics each carry one kind of evidence; share terminology, colors, and scales, use high-saturation accent colors for key objects, and let background information recede into neutrals. **Production**: units, axes, legends, scale bars, and panel labels must be complete and editable; microscopy and experimental images must not be distorted. Use colorblind-friendly palettes, never convey meaning through color alone, and add no decorative backgrounds.

### 10. Isometric exploded diagram

**Applies to**: product components, building levels, spatial facilities, mechanical assemblies, and modular systems. All parts share the same axonometric angle and scale, separated into layers along one clear assembly axis, with connecting lines pointing to real mounting relationships; encode housings, cores, interfaces, and accessories with stable colors or line weights, and number parts in reading order. **Production**: build simple structures with custom shapes; for complex geometry, use Python to compute positions or redraw from physical references. Never change part counts or assembly relationships for the sake of symmetry.

## Prohibited items
1. Do not draw arbitrary connections, reverse arrows, move user-annotated positions, or omit key nodes.
2. Do not decorate a structure that has not actually been explained with masses of cards and generic icons.
3. Do not let crossing lines, floating labels, or overlapping elements undermine the recognition of relationships.
4. Do not fabricate specialized structures, proportions, organs, atomic arrangements, or engineering details from common sense.
