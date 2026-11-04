# Product & E-Commerce Visuals

The following is general reference for this genre; user requirements, attachments, and the actual scenario take precedence.

Applies to product hero images, product selling-point images, product renders, product catalogs, and the visual presentation of packaging, labels, and cultural-creative merchandise.

**Benchmarks**: the product visuals and catalog systems of brands such as Apple, Dyson, Nike, Aesop, and MUJI, as well as highly polished hero images, selling-point images, packaging showcases, and product detail content on mature e-commerce platforms.

## Goals

### Put the product itself first
Product & e-commerce visuals are a highly image-led genre. First ensure the product's form, structure, colors, materials, logo, and key details are accurate; then use lighting, angle, background, and composition to enhance texture. Never alter the product itself for the sake of atmosphere.

### Organize the image sequence around the purchase decision
The hero image enables quick recognition; detail images explain materials and craftsmanship; scene images show how the product is used; selling-point images explain features and differences; catalog pages support comparison. Multiple images should form an ordered sales narrative, not repeat the same content with swapped backgrounds.

### Keep product, packaging, and brand consistent
The same product across different views, scenes, and pages must share the same base assets and brand assets. The graphics, text, size relationships, and colors of packaging, labels, and merchandise must not be regenerated image by image.

### Use real assets and image editing as the primary methods
When the user provides product images, prioritize background removal, cleanup, retouching, color grading, and compositing; only generate products when a concept product is needed or the user explicitly requests it — existing real products must not be replaced by generated images. Use `pptd.md` to lay out selling points, specs, and annotations; use Python, OpenCV, or ImageMagick for batch cutouts, masks, shadows, and multi-image unification.

## Visual references

The following directions are organized around different purchase decisions: recognize first, then understand the differences, then imagine using it, and finally act. Choose one primary direction that matches the product's attributes and channel, and have the hero image, detail images, scene images, and selling-point images share the same product baseline and lighting system; do not change the art style image by image.

The following entries only help you understand what excellent design in this genre might look like; they are not a routing table to match item by item, nor is any one of them required to be applied in full. Form your own direction from the user's content, then borrow composition, typography, color, imagery, or material treatments from them as needed; reasonable approaches not listed here are also acceptable.

### 01. Studio-shot hero image with negative space

**Applies to**: hero images for home appliances, home goods, beauty products, food packaging, and products that need an accurate presentation of appearance. The product occupies 55%–75% of the frame, shown head-on or from the three-quarter angle that best explains its structure; the background stays a solid color or an extremely subtle spatial gradient; shadow direction, contact surfaces, and material highlights must be realistic, while the headline and one core selling point take a secondary position. **Production**: prioritize cleaning up the real product image and unifying edges and color temperature; generate a concept product only when one is missing; never alter the logo, ports/connectors, or packaging text.

### 02. Ingredient & flavor story

**Applies to**: beverages, coffee, dairy, snacks, fragrance, and regional foods. The product remains the center, while ingredients form a second narrative layer through cut surfaces, scattering, close-ups, or origin environments; colors are extracted from the real flavor, such as lychee pink, tea green, or grain yellow, and 2–4 short labels explain taste, ingredients, or consumption scenarios. **Production**: prioritize real, searched assets for ingredients and unify the lighting; when compositing, keep foreground-background occlusion and proportions believable; do not bury the packaging under excessive floating elements.

### 03. High-end fashion catalog

**Applies to**: shoes and bags, apparel, jewelry, eyewear, and designer brands. Build a sense of value with high-quality product photography and an editorial grid, using large single-product shots, detail close-ups, on-body shots, and whitespace-heavy text pages to create rhythm; the palette follows the materials and season, headlines may carry an editorial tone, and prices, style numbers, and sizes stay restrained and accurate. **Production**: reuse the same product baseline and color grading across all angles, with fine cutouts and leather/metal texture retouching where needed; do not substitute luxurious textures or gold typography for the real materials.

### 04. Feature selling-point fact sheet

**Applies to**: office chairs, skincare, digital products, tools, sports equipment, and products whose performance needs explaining. Pair one primary product view with 3–5 zoomed-in details, structural annotations, or usage poses, explaining features in the order buyers care about most; numbers, units, and comparison conditions must be clear, with color used to distinguish components or states. **Production**: build the subject and annotations in separate layers, with detail crops taken from the same physical object rather than regenerated; never invent performance claims, certifications, or effects that were not provided.

### 05. Concept-scene product poster

**Applies to**: new product launches, fragrance, beauty, tech concepts, furniture, and products that need to build imagination. Build a single visual metaphor around the product's function or material, such as levitation, clouds, refraction, monumental scale, or a natural environment; the product stays accurate and intact, and the background and props reinforce only one selling point. **Production**: lock the real product down with a cutout first, then generate or composite the scene and match perspective, lighting, and reflections; effects must not pass through the product or alter its structure.

### 06. Handcrafted & cultural product narrative

**Applies to**: tea and liquor, pastries, pottery, textiles, regional specialties, and cultural-creative merchandise. Build warmth through real materials such as the making process, ingredients, hand movements, old paper, or fabric; the layout may use vertical columns, seal-style numbering, or small captions; colors come from the product, its packaging, and its place of origin — do not apply a generic antique gold-and-brown scheme. **Production**: prioritize searching for or using craft photos provided by the user, and when generating assets, specify real tools and steps; keep the brand name and packaging text preserved independently.

### 07. Promotional pop hero image

**Applies to**: holiday promotions, new arrivals, collaborations, youth-oriented consumer goods, and platform mega-sales. Build the first focal point with one large discount, the featured product, or a collaboration symbol, paired with a high-saturation background, bold headlines, and a limited number of burst graphics; price, thresholds, dates, and the action entry form a clear second tier. **Production**: use `pptd.md` to keep numbers and promotion rules editable, and unify cutouts and outlines across people or product images; do not turn every selling point into an eye-catching sticker, and never fabricate discounts.

### 08. Series & colorway catalog

**Applies to**: shoes, bags, makeup, food flavors, furniture color options, and multi-SKU products. All products share the same angle, scale, lighting, and background, supporting comparison through a grid, horizontal lineup, or color-spectrum ordering; each cell keeps only the name, colorway number, key differences, and the necessary price, while the series hero image builds richness with the full array. **Production**: unify cropping and color calibration first, then lay out; do not create preference through differing sizes, and do not let color swatches deviate too far from the real products.

### 09. Extreme close-perspective impact ad

**Applies to**: sneakers, snacks, beverages, trendy accessories, and launch ads that emphasize speed or scale. Use an ultra-wide or worm's-eye view, letting the product or a key prop occupy 45%–70% of the foreground while people or the environment recede rapidly backward; a giant headline runs along a diagonal or is cropped by the edge, the color field concentrates on one high-energy brand color, and the remaining areas stay clean. **Production**: lock the real product down first, then composite perspective, motion blur, rim light, and soft reflections; do not stretch the product's structure, and do not cancel out the impact with excessive small text and badges.

### 10. Folded-newspaper product ad

**Applies to**: coffee, food and drink, home goods, cultural-creative products, retro-style new releases, and product promotions that need a content story. Fill the canvas with a newspaper or catalog page bearing fold marks and print softening, where narrow text columns, rules, headlines, and stamps form the background, while one enormous real product breaks out of the page from below or the side; black, paper white, and one antique-gold/red spot color establish the editorial feel. **Production**: the newspaper content should come from real selling points or the brand story, and the product stays sharp with a believable shadow against the paper; do not fill space with unreadable fake text, and do not let the retro treatment alter packaging text.

## Prohibited items
1. Do not alter the shape, materials, colors, logo, ports/connectors, or key structures of a real product.
2. Do not generate the same product independently on different pages, causing its appearance, packaging, or brand details to contradict one another.
3. Do not use complex backgrounds, props, or effects to obscure the subject or create incorrect usage scenarios.
4. Do not describe a packaging mockup as a production-ready die-cut file, or fabricate dimensions, ingredients, performance, or prices.
