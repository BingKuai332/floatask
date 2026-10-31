# Font system

## Selection principles

1. Language matching: when the user's query is in Chinese or a Chinese PPT deliverable is requested, both Chinese and English fonts need to be specified; otherwise, only English fonts need to be set
2. Selection approach: it is recommended to prioritize highly readable fonts for body text, and to use stylized fonts plus special treatments (all caps, widened letter spacing, bold, italics, etc.) in titles or special pages to strengthen the style
3. The font combination must support the overall visual style positioning
4. Name consistency: **make sure font names are exactly identical, including capitalization and spaces, so that the model can use them correctly**

## Supported font types

Fonts fall into three categories, loaded in different ways:

### 1. System fonts

Can be referenced directly in `fontFamily` without importing via `customFonts`. The table below also lists common aliases: an alias points to the same font as the standard name and likewise needs no import, but `fontFamily` should always use the standard name. Chinese fonts keep their Chinese names as the standard names.

Note: system fonts are widely used and not stylistically distinctive. Unless the user explicitly requests them, or an uploaded PPT already uses them and consistency must be preserved, avoid them and prefer fonts from the CDN font list or Google Fonts.

| Standard name | Common aliases |
|---|---|
| 微软雅黑 | Microsoft YaHei, MS YaHei, 雅黑 |
| 等线 | DengXian |
| 黑体 | SimHei, Hei |
| 宋体 | SimSun, 中易宋体 |
| 华文黑体 | STHeiti, Heiti SC |
| 华文宋体 | STSong |
| 思源黑体 | Source Han Sans, Source Han Sans SC, Noto Sans CJK SC, Noto Sans SC |
| 仿宋 | FangSong, 仿宋体, 仿宋_GB2312 |
| 楷体 | KaiTi, 楷体_GB2312 |
| 方正小标宋简体 | 方正小标宋, FZXiaoBiaoSong-B05S |
| Calibri | — |
| Arial | — |
| Helvetica | — |
| Helvetica Neue | — |
| Times New Roman | Times, TNR |
| Georgia | — |

### 2. Preset CDN fonts

The 18 fonts in the "CDN fonts" list below are preset CDN fonts and must be declared via `customFonts` in the `.pptd` entry file before use (see CustomFont in [pptd.md](./pptd.md)): `src` is `https://statics.kimi.ai/neo-design-static/p-font/<value>.ttf`, where `<value>` is exactly the font name in the list, and `family` must also match that name exactly. Once declared, the font can be referenced in `fontFamily`.

URL encoding rule: spaces in `src` must be written as `%20`. Example: `LXGW Bright` → `https://statics.kimi.ai/neo-design-static/p-font/LXGW%20Bright.ttf`

### 3. Google Fonts

Beyond the preset CDN fonts, additional fonts can be brought in from Google Fonts via `customFonts` (e.g. JetBrains Mono for monospace, Archivo Black for ultra-heavy sans-serif, EB Garamond for classical serif) to strengthen expressiveness or fill uncovered categories: declare `customFonts` in the `.pptd` entry file (see CustomFont in [pptd.md](./pptd.md)); the `family` name must match Google Fonts exactly, and once declared it can be referenced in `fontFamily`.

Note: preset CDN fonts and Google Fonts fonts follow the same "exactly identical names" requirement

## CDN fonts

Font names keep their original language: Chinese fonts are named in Chinese.

### English fonts

| Font name | Font type | Style and characteristics | Suitable scenarios | Stylized font |
|---|---|---|---|---|
| Liter | Sans-serif | Modern neo-grotesque style; low contrast, balanced proportions, optimized for screens; clean and rational | Tech, product | No |
| HedvigLettersSans | Sans-serif | A "non-designer perspective" design; slightly irregular with a distinctive personality and strong brand character | Creative design, branding | No |
| Oranienbaum | Serif | Modern high-contrast serif; strongly geometric with elegant lines and a classical temperament | Culture, art, fashion | No |
| QuattrocentoSans | Sans-serif | Classic, elegant sans-serif; gentle, highly readable, clear at small sizes | Academic, corporate, education | No |
| SortsMillGoudy | Serif | Revival of the classical print style of Goudy Old Style; soft serifs, pleasant to read | Literature, humanities | No |
| Unna | Serif | Neoclassical serif with a pronounced vertical rhythm; elegant yet forceful | Literature, publishing, academia | Yes |
| Coda | Sans-serif | Rounded and friendly; soft curves, high openness | Business, friendly brand tone | Yes |
| Jersey15 | Sans-serif (sports style) | Sports jersey style; squared structure with a noticeable grid feel (supports English + digits only) | Sports, tech showcase pages | Yes |
| Jersey20Charted | Pixel font (grid shading) | Sports-number style with a shaded grid that reinforces an athletic texture (supports English + digits only) | Sports, mechanical, decorative showcase pages | Yes |

### Chinese fonts

| Font name | Font type | Style and characteristics | Suitable scenarios | Usage restriction |
|---|---|---|---|---|
| MiSans | Sans-serif (heiti) | Xiaomi system font; clean and modern, variable weights, excellent on-screen rendering (multilingual support) | Tech, corporate, product | No |
| 思源宋体 | Serif (songti) | Source Han Serif; refined songti structure with stroke contrast; elegant reading experience (multilingual support) | Literature, design, formal presentations | No |
| 阿里妈妈刀隶体 | Calligraphy (clerical script) | Alimama DaoLi; clerical-script style with blade-like strokes; strength and archaic simplicity combined | China-chic, culture, art displays | No |
| 站酷文艺体 | Handwriting | Zcool WenYi; clean and fresh with a slight handwritten feel and a strong literary/artistic vibe | Light design, lifestyle | No |
| 飞波正点体 | Calligraphy (brush) | Feibo Zhengdian; brush-writing style with heavy strokes, full of power | Film posters, e-commerce, brand display | No |
| 得意黑 | Sans-serif (slanted heiti) | Smiley Sans; tall, slanted heiti combining humanist and geometric qualities with a strong modern feel. **Does not support a non-italic upright style** | Creative tech, brand display | No |

### Mixed CJK–Latin fonts

| Font name | Font type | Style and characteristics | Suitable scenarios | Usage restriction |
|---|---|---|---|---|
| 精品点阵体 | Pixel font | Jingpin Dianzhen; 9×9 dot-matrix pixel style with an extremely retro electronic feel | Games, tech, pixel art | Yes |
| LXGW Bright | Serif (fangsong/kaiti) | LXGW WenKai family; combines fangsong and kaiti characteristics; gentle and clear letterforms | Literature, education, humanities | No |
| ZCOOL KuaiLe | Handwriting (rounded) | ZCOOL KuaiLe; lively, cute, playful and cartoonish; youthful energy | Anime, children, entertainment | No |
