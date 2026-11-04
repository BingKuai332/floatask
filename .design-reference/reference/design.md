# Design Guide

## General guidelines

1. Quality bar
- Aim for demanding professional design delivery; colors, style, alignment, and creativity must all withstand scrutiny.
- Unless the user asks for a conservative, generic result, form a clear design point of view based on the scenario and audience; do not deliver mediocre, clichéd solutions in the name of playing it safe.

2. Capability scope
- `pptd.md` provides editable capabilities for text, shapes, images, charts, tables, and animations, and supports arbitrary hex colors, custom shapes, and custom fonts (preset CDN fonts and Google Fonts, see fonts.md).
- **`pptd.md` is the capability floor, not the boundary**; when needed, combine Python, bash, image search, and image generation to achieve complex shapes, image processing, and advanced visual effects—never downgrade to a crude PowerPoint-style assembly.

3. Canvas ratio and orientation
`pptd.md` supports any `[width, height]` as required by the user.
- When the user explicitly specifies a size, orientation, or ratio, strictly follow the user's requirement.
- When the user has not specified, judge common sizes from the usage scenario: posters, roll-up banners, social media, and scientific figures each have their conventional visual ratios.

| Common ratio | Reference size |
|---|---:|
| 16:9 | `[1280, 720]` |
| 9:16 | `[720, 1280]` |
| 4:3 | `[1280, 960]` |
| 3:4 | `[960, 1280]` |
| 1:1 | `[1080, 1080]` |

4. Other notes
- Exercise restraint in the type system: no more than 4 font-size levels by default (e.g., main title, subtitle, body, caption/source); add levels only when an independent and necessary semantic tier exists—do not let each module use its own font, weight, size, and color.
- Whitespace must serve focus, grouping, or reading rhythm. Avoid large empty areas that carry no visual weight, hierarchy separation, or alignment relationship.
- When text overlays an image, check readability over the actual overlay area. When local contrast is insufficient, adjust the image crop, text position, or text color, or add the necessary local backing; never judge from the image's overall dominant color alone.
- When the same person, product, space, logo, or other key object appears repeatedly, reuse the same source or derive it from the same base asset to keep form, color, proportion, and key details consistent; do not generate it independently page by page.

## Design genres
First identify one primary genre based on the final deliverable the user needs and its main acceptance criteria. Teaching, scientific research, animation, serialization, and the like are content domains or presentation methods, not genres in their own right: multi-panel paper figures and mechanism/experiment-process figures belong to diagrams; one-page graphics built around data or knowledge conclusions belong to infographics; medical, flora/fauna, and artifact-form rendering belongs to illustration; course handouts and learning materials belong to documents.

| Genre | Typical requests | Document path |
|---|---|---|
| Illustration and characters | scene illustration, character design, character three-view sheets, wallpapers | `reference/profiles/illustration.md` |
| UI design | static interface mockups, game interfaces, mini-program interfaces, page visual redesigns | `reference/profiles/ui-design.md` |
| Diagrams and structures | flowcharts, architecture diagrams, mechanism diagrams, roadmaps, system relationship diagrams | `reference/profiles/diagram.md` |
| Infographics and data visualization | knowledge infographics, data stories, financial infographics, long data-visualization graphics | `reference/profiles/infographic.md` |
| Documents and editorial design | resumes, reports, manuals, book covers, menus, notices, forms | `reference/profiles/document.md` |
| Campaign posters and key visuals | event posters, recruitment posters, promotional key visuals, roll-up banners, display boards, event backdrops and wayfinding materials | `reference/profiles/campaign-poster.md` |
| Social media content | Xiaohongshu covers, video covers, WeChat Official Account covers, Moments or Instagram graphics, carousels | `reference/profiles/social-media.md` |
| Art and culture posters | art posters, cultural posters, exhibition visuals, experimental posters | `reference/profiles/art-poster.md` |
| Brand and identity | logos, wordmarks, app icons, basic brand visual identity | `reference/profiles/brand-identity.md` |
| Product and e-commerce visuals | product hero images, product selling-point graphics, product renders, catalogs, packaging, labels, and cultural-creative merchandise | `reference/profiles/product-commerce.md` |
| Invitations and cards | wedding invitations, event invitations, business cards, certificates, and ID cards | `reference/profiles/invitation-card.md` |
| General visual | no clear genre identifiable, or visual design needs outside the above genres | `reference/profiles/general.md` |

## Prohibited items
Unless the user explicitly requests otherwise, do not use:
1. **Default card layouts**: do not build hierarchy and alignment with rounded rectangles or rectangular cards; prefer rule lines, whitespace, and typographic hierarchy.
2. **Evenly divided compositions**: do not default to three-way or four-way splits, 2×2 matrices, or a fixed "title + three columns + conclusion" skeleton.
3. **Typical AI color schemes and effects**: do not default to blue-and-white schemes, blue-purple gradients, cyan-purple neon, rainbow light spots, glassmorphism cards, or glowing borders.
4. **Style-conflicting elements**: do not add styles outside the overall style, such as rounded icons or rounded rectangles within a sharp-edged style.
