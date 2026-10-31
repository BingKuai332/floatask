# Illustration & Characters

The following is general reference for this genre; user requirements, attachments, and the actual context take precedence.

Applies to needs centered on rendered figures and atmosphere, such as scene illustration, character design, character three-view sheets, narrative illustration, and wallpapers.

**Benchmarks**: mature editorial illustration such as The New Yorker, the Society of Illustrators annuals, publicly released character development work from teams such as Pixar and Riot Games, and character designs and scene concept art from outstanding picture books, games, and animation projects.

## Goals

### Establish the setting before drawing the image
First define the worldview, character identity, design keywords, art style, viewpoint, lighting, and mood. Scenes, actions, props, and colors must all serve the same narrative moment; do not merely generate a generically attractive illustration with no specificity.

### Keep characters and key objects consistent
When the same character appears multiple times, reuse the same base model sheet or reference image, preserving face shape, hairstyle, clothing, proportions, color scheme, and signature details. Three-view sheets, expression sets, and pose sets must use comparable pose baselines; do not improvise independently from sheet to sheet.

### Let composition carry the narrative
A single illustration should have a clear visual focus, distinct foreground/middle ground/background, and a viewing path; a series of illustrations should create variation through viewpoint, shot scale, or plot progression while retaining a unified cast and worldview.

### Use image generation and editing as the primary means
Illustration is an image-led genre. Use image generation to establish subjects and scenes, then correct details with background removal, inpainting, outpainting, color grading, and compositing; when titles, design notes, or annotations are needed, use the text and shapes in `pptd.md` to keep them editable. Do not substitute generic vector icons for the specific people and scenes the user requested.

## Visual references

The following directions come from compositional approaches that recur in mature illustration work, and serve only as starting points. First choose a direction based on the narrative task, usage size, and whether series consistency is required, then unify figures, objects, scenes, and text under one set of design rules; do not merely copy brushstrokes or filters.

These entries exist only to help you understand what excellent design in this genre can look like; they are not a routing table to match item by item, nor must any single one be applied in full. Form your own direction from the user's content, then borrow composition, typography, color, imagery, or material treatment from these entries as needed; reasonable approaches not listed here are also acceptable.

### 01. Glyph-container object illustration

**Applies to**: covers or single illustrations on themes of cities, professions, brand culture, festivals, and knowledge. First choose a Chinese character, letter, or numeral related to the theme as the overall silhouette, then fill the silhouette with same-theme objects such as buildings, figures, utensils, and plants; the objects share one perspective, line weight, and primary color, and a large clean background is preserved around the outside, so the piece reads as a glyph from afar and reveals detail up close. **Production**: first build the glyph mask and title with `pptd.md`, then generate or draw same-style objects and place them one by one; do not randomly stuff the silhouette with unrelated knickknacks.

### 02. Monochrome city linework atlas

**Applies to**: city culture, travel, architecture, local brands, and spatial storytelling. Draw landmarks, street scenes, and everyday details in one highly recognizable ink color on warm-white paper, using an editorial structure of a main scene plus several detail panels; perspective may be slightly exaggerated, but architectural features, proportional relationships, and locational cues must remain credible. **Production**: search for images of real landmarks to confirm them first, then convert them uniformly into linework or generate within the same line-art system; set titles, place names, and annotations as separate typography, avoiding line density that crushes the text.

### 03. Cinematic narrative scene

**Applies to**: wallpapers, story covers, brand scenarios, game concept art, and mood scenes featuring people. First fix one specific moment, building depth with foreground occlusion, middle-ground action, distant environment, and a single light source; the characters' actions, sightlines, and props must all point to the core of the story, and the palette is limited to one set of primary colors plus one set of light-source colors. **Production**: before generating, lock the character design, lens focal length, time of day, and weather, then use inpainting to correct hands, clothing, and key objects; interfaces, titles, or explanatory text must be overlaid separately outside the image.

### 04. Modular object icon family

**Applies to**: food culture, lifestyle, service explanations, brand columns, and series of educational illustrations. Break the theme into a set of individually recognizable objects drawn with the same viewpoint, corner radius, stroke, and shadow rules; use 3–5 stable colors, creating variation through size and density rather than by introducing new styles. **Production**: first complete 6–12 core master objects and check their consistency side by side, then compose them into posters or pages; do not mix in photorealistic photos, assets from another line-weight system, or assets lit by a different light source.

### 05. Standardized character design board

**Applies to**: character three-view sheets, costume design, expression sets, pose sets, and game character development. Present front, side, and back views on the same height baseline with the same proportions under neutral lighting, with key garments, accessories, and patterns corresponding across views; expression and pose pages are developed separately, using local close-ups and short annotations to mark the identifying points that must not be lost. **Production**: reuse the same character reference image and a fixed prompt, generate sheet by sheet, then perform consistency correction; annotations, color swatches, and dimension lines use editable elements — do not generate them into the image.

### 06. Naive picture-book narrative

**Applies to**: parent-child, public-welfare, community, and healing themes, and lighthearted everyday stories. Use broken crayon-, marker-, or oil-pastel-like lines, keeping large color blocks incompletely closed and slightly misregistered; character proportions may be naive, but actions must read clearly, the image revolves around one everyday event, and 4–6 bright colors carry through the series. **Production**: when generating, specify paper, stroke texture, and imperfect edges, and keep real hand-drawn sketches when necessary; do not polish the result into slick vector graphics, and do not let "cute" substitute for concrete story events.

### 07. Scientific natural-history plate

**Applies to**: flora and fauna, medicine, biology, object structures, and instructional illustration. The subject centers on accurate contours and natural colors, surrounded by explanations built from cross-sections, life cycles, scale bars, or numbering; the background stays quiet, labels align along one consistent direction, and decorative textures must not obscure structure. **Production**: professional morphology must be based on attachments or reliable sources, calibrated with searched reference material or programmatic drawing aids when necessary; subjects may be generated or hand-drawn, but connector lines, names, units, and legends should remain editable.

### 08. Folk multi-block woodcut print

**Applies to**: local culture, traditional festivals, handicrafts, music, and narrative themes with a sense of period. Use 2–4 ink colors, bold contours, flat-block shading, and visible registration offsets, with compositions emphasizing group figures, artifacts, or regional symbols; paper fiber, woodcut knife marks, and ink tonal variation should participate in the forms rather than being a layer of noise overlaid at the end. **Production**: first verify the composition in black-and-white shapes, then do color separation and misregistration effects; traditional symbols must correspond to their specific cultural context — avoid casually mixing patterns from different regions.

### 09. Geometric paper-cut motion illustration

**Applies to**: sports, youth culture, brand columns, abstract concepts, and illustrations needing a light, agile sense of motion. On warm-white paper, assemble figures, animals, or objects from 4–7 large-scale geometric color shapes, with the subject off-center and unfolding along a diagonal axis of action; black hand-drawn lines only supplement hands and feet, facial features, handles, and speed lines — they must not re-trace every outline. **Production**: first check the silhouette in flat color shapes, then add light grain, dry-brush texture, and a small amount of airbrushed transition; colors and shapes must derive from the thematic relationships — no random abstract collage.

### 10. Animation development sketches

**Applies to**: character actions, pet stories, expression exploration, storyboards, and illustrations meant to show the creative process. Use a warm paper base, red-brown construction lines, dark confirmation lines, and translucent watercolor blocks, preserving correction marks, action ticks, and unfinished environment lines; each page centers on one clear action gag or emotional shift, and key poses may be placed side by side but character designs must not be restated inconsistently. **Production**: first lock character proportions and signature details, then generate or draw the action variations; a sketchy feel means a visible process of iteration, not low finish or careless misalignment.

## Prohibited items
1. Do not lose, replace, or arbitrarily alter user-uploaded figures, sketches, and key visual settings.
2. Do not let the same character's design, clothing, proportions, or identity features change repeatedly across a series of images.
3. Do not merely imitate the surface brushwork of a reference image while ignoring subject matter, narrative, and compositional relationships.
4. Do not generate large amounts of text directly into illustration images; when accurate text is needed, use editable text elements.
