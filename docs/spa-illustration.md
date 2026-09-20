# Spa relaxation illustration

Reusable Vue 3 + TypeScript inline SVG: `app/components/customer/SpaRelaxationIllustration.vue`.
The login page uses it through `CustomerAuthCharacter.vue`, which owns the green panel and text. The illustration itself has a transparent outer background.

## Usage

Nuxt auto-imports the component:

```vue
<template>
  <SpaRelaxationIllustration
    :size="520"
    :animated="true"
    primary-color="#46533f"
  />
</template>
```

For a static illustration that fills its parent:

```vue
<SpaRelaxationIllustration size="100%" :animated="false" />
```

Outside Nuxt, import the component from its file before using it.

| Prop | Type | Default | Behavior |
| --- | --- | --- | --- |
| `size` | `number \| string` | `520` | Preferred width in pixels for numbers, or a CSS width. Shrinks to fit the parent. |
| `animated` | `boolean` | `true` | Enables CSS animation. Reduced-motion preferences override this setting. |
| `primaryColor` | `string` | `#46533f` | CSS color used for the hair and body towels. Shades derive from this color. |

The SVG uses a 520 × 500 viewBox and preserves its aspect ratio. Unique Vue IDs keep definitions and accessible title/description references independent across multiple instances. Named `data-part` groups identify the artwork layers; animations only use transforms and opacity. All artwork is inline, without image URLs, icon packages, or animation dependencies.
