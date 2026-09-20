# Câu chuyện — illustration sources

The story page uses a single muted palette: moss/sage, warm cream, charcoal green, terracotta and natural skin tones. Every scene uses a 720 × 560 composition; people retain the proportions of the source drawing. The illustrations are SVG throughout and have no raster image or remote runtime dependency.

## Adapted character drawings

Copyright Katerina Limpitsouni / unDraw. Downloaded 2026-09-21 and modified for the MIÊN website under the [unDraw license](https://undraw.co/license). The license permits commercial project use and modification. These files are project assets, not a redistributable illustration collection.

| Local asset | Original | Adaptation |
| --- | --- | --- |
| `public/images/story/arrival.svg` | [Confident](https://undraw.co/illustration/confident_9v38) — [source SVG](https://cdn.undraw.co/illustration/confident_9v38.svg) | Retained the walking woman; removed interface badges and ground; recolored clothing, skin and hair. |
| `public/images/story/listening.svg` | [Getting coffee](https://undraw.co/illustration/getting-coffee_rzv2) — [source SVG](https://cdn.undraw.co/illustrations/getting-coffee_rzv2.svg) | Retained both seated people, cups, table and chairs; removed outdoor trees, sky and ground; applied the MIÊN palette. |
| `public/images/story/renewal.svg` | [Sunny Walk](https://undraw.co/illustration/sunny-walk_iadv) — [source SVG](https://cdn.undraw.co/illustration/sunny-walk_iadv.svg) | Retained the walking woman; removed park, bench and sun; recolored and reframed. |
| `public/images/story/finale.svg` | [Mindfulness](https://undraw.co/illustration/mindfulness_d853) — [source SVG](https://cdn.undraw.co/illustration/mindfulness_d853.svg) | Retained the seated woman; removed plant icons and ground; recolored and reframed without cropping the limbs. |

`StoryIllustration.vue` composes these characters with new architectural SVG backgrounds, botanical branches, furniture and light. Character files load locally with native lazy loading below the hero. Explicit aspect ratios reserve their layout space. The decorative backgrounds are hidden from assistive technology; the character images carry descriptions.

## Original scene drawings

- `StoryNatureIllustration.vue`: amber oil bottle, linen, five-petal flower, ceramic water bowl, stacked massage stones and botanical branch on display plinths.
- `StoryTreatmentIllustration.vue`: a reclining adult woman on a chaise, draped linen, headwrap, profile face, articulated arm/hand and feet, candle, skincare bottle, flowers and arched window.

The treatment scene replaces the login illustration only on `/cau-chuyen`. The existing `SpaRelaxationIllustration.vue` remains available for its other consumers.

## Motion

- Characters keep their drawn proportions; motion is limited to chapter entrance and scene positioning.
- Botanical layers sway less than one degree; light scales subtly.
- Treatment progress reveals only the mask, cucumber, candle flame and flowers. The person, towel, furniture and candle body remain opaque throughout.
- There is no translucent foreground veil. `prefers-reduced-motion` disables decorative loops and shows treatment accessories immediately.
