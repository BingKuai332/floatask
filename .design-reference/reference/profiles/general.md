# General Visual

The following is a general reference; the user's requirements, attachments, and the actual context take priority.

Apply this only to visual design needs where no clear genre can be identified, or that genuinely do not belong to any other Profile. When the primary genre can be determined, do not use this file.

**Benchmarks**: real projects by established design studios and designers such as Pentagram, Studio Dumbar, 2x4, and Kenya Hara, as well as outstanding cross-genre works collected by D&AD, ADC, and Tokyo TDC. The benchmark is problem understanding and design finish, not a uniform visual style.

## Goals

### First determine whether a general approach is truly needed
Identify other Profiles first from the final deliverables, purpose, and acceptance criteria. Use this file only when the need spans multiple genres or cannot be classified; do not default to general visual merely because the judgment is difficult.

### Complete the design brief from a vague request
Fill in the necessary design decisions based on purpose, audience, reading environment, canvas, content density, and mood. You may infer the visual direction and asset strategy, but must not fabricate dates, prices, data, personal histories, brand information, or business facts.

### Establish a well-grounded lead concept
Choose a visual language related to the theme, industry, culture, era, or material, so that typography, color, imagery, and composition all serve the same direction. Even simple Queries should yield a clear judgment; they must not degenerate into default cards and generic tech style.

### Choose the most suitable technical combination for the content
Prefer `pptd.md` for text, shapes, tables, charts, and editable structures; search for images when real assets are needed, generate images when custom scenes and illustrations are needed, and perform background removal, cropping, color grading, and compositing when assets need to be unified; use Python, OpenCV, or ImageMagick only for complex computation or image processing. Tool selection must serve the result, not demonstrate capability.

## Visual references

General visual has no fixed style library. The following are only five starting points for cases where the genre genuinely cannot be determined; choose one of them as the dominant relationship based on the content. As soon as a task can be clearly assigned to another Profile, immediately switch to the more specific genre guide.

The entries below exist only to help you understand what good design in this genre may look like; they are not a routing table to be matched item by item, nor does any single one need to be applied in full. Form your own direction from the user's content, then borrow composition, typography, color, imagery, or material treatment from them as needed; reasonable approaches not listed here are also acceptable.

### 01. Text-led

**Applies to**: viewpoints, manifestos, short essays, names, and visuals where a single sentence must be read first. Let one headline or key sentence occupy the main area; build structure within 2 typefaces and 3 type-size levels; color and rules serve only pausing, emphasis, and grouping; the composition may be asymmetric, but every block of whitespace must relate to the text baseline or visual center of gravity. **Production**: prefer `pptd.md` to keep text editable; do not fill space with irrelevant images.

### 02. Image-led

**Applies to**: tasks where people, places, atmosphere, events, or the visual material itself matters most. First select one hero image that is accurate enough and has compositional potential, then decide between full-bleed, partial crop, or margins; the title and caption fall on naturally quiet areas or on a separate support; supporting images only supply details the hero image cannot convey. **Production**: prefer the user's assets and real image search, generating only what is missing; do not overlay small text on low-contrast areas, and do not fill the canvas evenly with multiple weak images.

### 03. Single object or symbol-led

**Applies to**: tasks whose theme can be represented by one product, artifact, logo, number, or simple metaphor. Let that object carry 40%–70% of the visual weight; create a memorable point through scale, repetition, cropping, or color, with all remaining content building a clear hierarchy around the object; background and decoration only reinforce the same concept. **Production**: prefer accurate assets or editable shapes for the object, and lock its appearance when generating scenes; do not alter key structures in pursuit of spectacle.

### 04. Structure- and data-led

**Applies to**: content whose value comes from relationships, comparisons, steps, quantities, or categories, where the final deliverable is not yet determined. First choose one primary structure—such as a process, a comparison, a timeline, a map, or a chart—then use the title to state the conclusion the reader should remember; color, shape, and position express only stable semantics, with decoration retreating behind the evidence. **Production**: use editable graphics and real data; when relationships are complex, reroute to the diagram or infographic Profile; do not use card grids to mask the structure.

### 05. Serial narrative-led

**Applies to**: multiple pages, images, or deliverables that must jointly tell the story of a process, a person, or a theme. Fix the typography, color palette, protagonist, and one identifying motif; arrange the opening, development, turn, and closure through variation in shot scale, text-to-image ratio, and information density; each page carries only one task of advancing the narrative. **Production**: first make a global thumbnail overview, then refine page by page, reusing the same person and asset baseline; do not change style on every page, and do not copy the same page skeleton.

## Prohibited items
1. Do not use the general approach when a clear genre can be identified, bypassing more specific design guides.
2. Do not use cards, gradients, decorative icons, and generic tech style to mask insufficient content structure.
3. Do not deliver low-finish output lacking a visual concept, information hierarchy, and asset judgment merely because the user's Query is short.
4. Do not mix multiple style directions, type systems, and image treatments without justification.
