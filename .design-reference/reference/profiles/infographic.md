# Infographics and Data Visualization

The following is a general reference for this genre; user requirements, attachments, and the actual scenario take precedence.

Applies to knowledge infographics, data stories, financial infographics, statistical charts, and long-form data visualizations.

**Benchmarks**: Data-journalism teams such as The New York Times Graphics, Reuters Graphics, Financial Times Visual Journalism, and Bloomberg Graphics, as well as outstanding information-design works such as Information is Beautiful.

## Goals

### Organize the entire infographic around a single conclusion
First distill the core takeaway the reader should remember, then arrange the opening, evidence, explanation, comparison, and closing. Do not distribute several facts evenly across identical modules; an infographic needs a clear reading order and shifts of emphasis.

### Match charts to real data relationships
Choose charts based on comparison, trend, composition, distribution, geography, or correlation. Area, length, position, and color must truthfully correspond to the data, and titles, units, time ranges, legends, and necessary sources must be fully preserved.

### Balance text, charts, and explanatory graphics
Infographics are usually a mixed text-and-image genre. Key figures and charts carry the evidence, brief text explains causes and conclusions, and icons and illustrations only aid understanding — they are not decoration to fill the canvas evenly.

### Choose the technique according to complexity
For ordinary charts, text, shapes, and layouts, prefer `pptd.md` and keep them editable. When the data volume is large, charts are complex, or programmatic computation is needed, use Python to process the data and draw the charts, then integrate the results into the overall layout. Maps, people, or scene materials may be searched for, generated, and edited, but must not alter the meaning of the data.

## Visual references

The directions below are organized by how the reader arrives at the conclusion. Each infographic selects only one primary narrative path, with the title, figures, charts, illustrations, and sources all proving the same conclusion; do not read these directions as layout modules that can be assembled at will.

The following entries exist only to help you understand what excellent design in this genre can look like. They are not a routing table to be matched item by item, nor is any one of them required to be applied in full. Form your own direction from the user's content, then borrow from their composition, typography, color, imagery, or material treatment as needed; reasonable approaches not listed here are also acceptable.

### 01. Subject-object knowledge poster

**Applies to**: food, products, animals and plants, health basics, and single-concept explainers. Place one clear subject image at the center or lower half of the canvas, and arrange 3–6 facts, parts, or metrics around it connected by leader lines; build unity with light and dark tones close to the subject, and close with the main conclusion as one large number or short sentence. **Production**: prioritize real photographs or accurate illustrations for the subject, and typeset text and annotations independently; do not turn every fact into an equal-sized card.

### 02. Editorial data story

**Applies to**: long-form graphics on finance, social issues, industry reports, and survey results. Open with a headline-style conclusion, then arrange sections of varying rhythm along the arc of "phenomenon — evidence — cause — impact — closing"; the main chart occupies the largest visual area, secondary figures, quotes, and explanatory graphics are interspersed throughout, and color marks only the key series. **Production**: first clean and plot the real data with Python, then use `pptd.md` for the editorial grid, annotations, and sources; decorative illustrations must not take the leading position away from the evidence.

### 03. Systematic classification field guide

**Applies to**: comparisons of chemical substances, product models, species, terminology, materials, and knowledge lineages. First establish unified comparison dimensions, then let each column or row present name, structure, appearance, metrics, and usage in sequence; repeated items strictly share scale, viewpoint, icons, and label positions, and spot colors are used only for categories or exceptional differences. **Production**: use editable elements for the table skeleton and text, and generate or draw molecules, models, or sample images under one consistent specification; do not omit units or alter the proportions of objects for the sake of appearance.

### 04. Instructional step-by-step explainer

**Applies to**: course knowledge, introductions to complex concepts, experimental teaching, and research communication for the general public. Each graphic revolves around a single learning objective and is divided into 3–6 steps following "phenomenon — principle — example — conclusion" or a real causal sequence; use black line art with one or two highlight colors, guide the reading with arrows, local magnifications, and state changes of the same object, and explain each term directly when it first appears. **Production**: first write a clear step-by-step script, then draw the scenes with a unified viewpoint and line weight; font sizes should suit classroom projection or phone reading, intermediate causal steps must not be omitted, and a hand-drawn feel must not be used to conceal errors.

### 05. Map narrative and route infographic

**Applies to**: travel guides, city observations, outdoor routes, regional resources, and event distributions. The map carries the spatial evidence, with routes, zones, or points encoded in a single set of high-contrast colors; distances, times, difficulty, stories, and tips are interspersed along the side of the canvas or along the path, so readers can both grasp the whole picture and act in sequence. **Production**: the base map must come from real geographic information or a user attachment, and illustrated landmarks may be moderately simplified; locations must not be moved arbitrarily for the sake of a tidy layout.

### 06. Botanical and natural-science illustrated guide

**Applies to**: plants, ingredients, ecology, solar terms, local species, and nature observation. Use field-guide-style whitespace, with one to several precise illustrations as the subject, accompanied by layered annotations such as name, parts, origin, season, and use; colors come from the object itself, and the background uses paper white, light gray, or low-saturation natural tones. **Production**: illustrations must be based on real forms, with labels arranged along a grid or radial lines; do not mix different drawing styles, and do not treat decorative flowers and plants as scientific information.

### 07. Timeline and trend long-form graphic

**Applies to**: industry evolution, historical events, annual reviews, policy changes, and long-term data. Use a continuous timeline or line chart as the main spine, and distinguish key stages through layout rhythm and background bands; events, data, and explanations belong to separate layers, and turning points are emphasized through spot color, magnification, or local illustrations. **Production**: real time is scaled proportionally or clearly marked "not to scale," charts are generated from data, and event text is typeset independently; avoid giving every year the same visual weight.

### 08. Finance and operations snapshot

**Applies to**: market briefs, weekly business reports, product metrics, sports data, and results reviews. First give a one-sentence conclusion and 2–4 core figures, then explain the reasons through trends, composition, rankings, or funnels; use a compact grid, aligned numbers, and high-contrast semantic colors, with charts mattering more than decorative icons. **Production**: keep units, decimals, time ranges, and sources complete, and let rise/fall colors follow the audience's conventions; do not use dashboard screenshots directly as an infographic, and do not use decorative curves without data.

### 09. Aggregate-object metaphor public-interest graphic

**Applies to**: environmental protection, public health, safety, resource consumption, and issues that need an immediate intuitive impact. Let one kind of recognizable source objects together form another clear target silhouette — for example, waste forming the affected object; from a distance the reader first reads the symbol, up close they discover the constituent materials, and beside it place only one core fact and a small amount of supporting data. **Production**: first validate the black-and-white silhouette, then generate or composite objects that are individually recognizable, treated with a uniform halftone or color overlay; the metaphor must have a factual basis, and a shocking image must not replace sources.

### 10. Evidence-panel specification infographic

**Applies to**: material properties, artifact research, sports equipment, technology products, and science communication requiring multi-scale observation. Use one large-scale subject image with a top evidence bar, 2–4 microscopic or detail windows, connecting lines, and a parameter table, on a light-grid or technical-paper background; each window answers one explicit question, and units, test conditions, and conclusions share fixed positions. **Production**: the subject and its details must come from the same object, and charts and parameters stay editable; do not manufacture a sense of professionalism with decorative scan frames, fake coordinates, and unsourced values.

## Prohibited items
1. Do not fabricate data, sources, rankings, proportions, or precise conclusions.
2. Do not use charts that do not match the data relationships, or create misleading impressions by means such as truncating axes.
3. Do not make all content into equal-sized cards, causing the main conclusion and the evidence hierarchy to disappear.
4. Do not degrade mobile readability with large amounts of small text, overly dense labels, and decorative icons.
