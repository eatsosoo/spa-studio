<script setup lang="ts">
const props = defineProps<{ variant: 'arrival' | 'listening' | 'nature' | 'renewal' | 'finale' }>()
const titles = { arrival: 'Một vị khách bước vào không gian của MIÊN', listening: 'Cuộc trò chuyện bên trà thảo mộc', nature: 'Những nguyên liệu chăm sóc từ thiên nhiên', renewal: 'Cảm giác tươi sáng sau khi được chăm sóc', finale: 'Không gian thư giãn của MIÊN Spa' }
</script>

<template>
  <svg class="story-art" :class="`story-art--${variant}`" viewBox="0 0 620 520" role="img" :aria-label="titles[props.variant]">
    <path class="story-art__ground" d="M69 397C144 342 205 382 271 348C353 306 420 335 552 385C507 459 399 481 278 478C168 475 98 455 69 397Z" fill="#d8dfce" />
    <g class="story-art__plants" fill="#6f9571"><path d="M82 404C61 350 70 293 109 257C119 310 103 359 82 404Z" /><path d="M92 408C109 348 137 318 177 302C164 350 135 387 92 408Z" fill="#8eb18a" /><path d="M526 407C550 350 539 300 509 268C493 318 505 370 526 407Z" /><path d="M519 407C492 356 461 332 430 318C438 358 472 393 519 407Z" fill="#9ab694" /></g>

    <g v-if="variant === 'arrival'" class="story-art__figure">
      <path d="M342 144C331 104 356 72 397 74C435 76 450 108 442 150L429 218H354Z" fill="#3f4e39" /><circle cx="393" cy="139" r="44" fill="#e9b784" /><path d="M354 133C361 93 423 86 440 128C414 116 381 113 354 133Z" fill="#4d5847" />
      <path d="M354 206C377 187 415 187 436 210L474 376L318 376Z" fill="#d98978" /><path d="M354 215L324 302L292 349" stroke="#e9b784" stroke-width="24" stroke-linecap="round" /><path d="M384 375L373 454M430 375L447 454" stroke="#52614b" stroke-width="25" stroke-linecap="round" /><path d="M361 458H389M433 458H463" stroke="#30382c" stroke-width="12" stroke-linecap="round" /><path d="M449 230C487 236 506 265 503 300" fill="none" stroke="#e9b784" stroke-width="20" stroke-linecap="round" />
    </g>

    <g v-else-if="variant === 'listening'" class="story-art__conversation">
      <ellipse cx="310" cy="381" rx="155" ry="24" fill="#b8c8ad" /><rect x="255" y="276" width="110" height="16" rx="8" fill="#9a7a61" /><path d="M274 290L263 379M347 290L358 379" stroke="#80634f" stroke-width="9" />
      <g><circle cx="180" cy="187" r="42" fill="#edba86" /><path d="M140 185C140 130 218 128 224 186C202 161 167 158 140 185Z" fill="#42503c" /><path d="M139 231C161 209 198 210 220 234L239 360H119Z" fill="#758d70" /><path d="M215 259L277 299" stroke="#edba86" stroke-width="18" stroke-linecap="round" /></g>
      <g><circle cx="437" cy="187" r="42" fill="#e8b17e" /><path d="M396 191C391 135 472 125 481 189C456 161 421 163 396 191Z" fill="#7b5748" /><path d="M396 232C418 210 456 210 479 237L503 360H374Z" fill="#d58b78" /><path d="M407 258L349 299" stroke="#e8b17e" stroke-width="18" stroke-linecap="round" /></g>
      <g class="story-art__steam"><path d="M303 266C287 248 314 239 300 221M323 266C338 246 314 236 329 217" fill="none" stroke="#fffaf0" stroke-width="5" stroke-linecap="round" /><rect x="291" y="267" width="42" height="28" rx="10" fill="#f7f0de" /></g><g class="story-art__talk" fill="none" stroke="#91ae8d" stroke-width="4"><circle cx="310" cy="134" r="18" /><circle cx="349" cy="112" r="9" /><circle cx="270" cy="108" r="12" /></g>
    </g>

    <g v-else-if="variant === 'nature'" class="story-art__ingredients">
      <circle cx="310" cy="257" r="115" fill="#c9dcc5" /><path d="M311 363C289 286 278 212 319 139C349 213 342 290 311 363Z" fill="#56815b" /><path d="M307 348C241 304 214 238 229 177C289 219 314 274 307 348Z" fill="#7fa37b" /><path d="M322 348C382 302 407 239 392 185C345 218 320 274 322 348Z" fill="#95b58e" />
      <g class="story-art__bottle"><rect x="104" y="220" width="78" height="132" rx="25" fill="#e6c889" /><rect x="124" y="188" width="39" height="41" rx="8" fill="#6f8766" /><rect x="119" y="267" width="49" height="45" rx="4" fill="#fff8e9" /><path d="M144 300C122 282 146 270 163 278C160 293 152 298 144 300Z" fill="#77946e" /></g>
      <g class="story-art__drop"><path d="M497 177C530 220 541 239 541 262C541 293 522 311 497 311C472 311 453 293 453 262C453 239 465 220 497 177Z" fill="#8fc5c5" /></g><g class="story-art__stones"><ellipse cx="457" cy="379" rx="67" ry="25" fill="#8c9188" /><ellipse cx="468" cy="351" rx="53" ry="24" fill="#a8aaa0" /><ellipse cx="456" cy="326" rx="39" ry="20" fill="#c3c0b4" /></g><g class="story-art__flower"><circle cx="192" cy="146" r="13" fill="#d99b77" /><circle cx="172" cy="132" r="21" fill="#f7ead0" /><circle cx="211" cy="129" r="21" fill="#f7ead0" /><circle cx="192" cy="111" r="21" fill="#fff8e9" /></g>
    </g>

    <g v-else class="story-art__renewed">
      <circle cx="424" cy="150" r="78" fill="#f0d59d" opacity=".8" /><g class="story-art__rays" stroke="#e3bd73" stroke-width="5" stroke-linecap="round"><path d="M424 42V17M424 282V257M316 150H291M557 150H532M348 74L330 56M500 226L518 244M500 74L518 56" /></g>
      <path d="M250 152C245 103 276 75 318 82C357 88 370 124 355 170L344 224H259Z" fill="#4c5946" /><circle cx="307" cy="151" r="45" fill="#edbb87" /><path d="M265 142C280 104 339 108 352 144C320 130 294 130 265 142Z" fill="#53604c" /><path d="M266 218C289 195 329 197 350 222L387 396H220Z" fill="#829c78" /><path d="M274 396L263 459M341 396L354 459" stroke="#4f5b49" stroke-width="26" stroke-linecap="round" /><path d="M249 462H278M339 462H369" stroke="#30382c" stroke-width="12" stroke-linecap="round" /><path d="M275 161Q287 169 298 160M319 160Q331 169 341 158M299 184Q310 194 322 183" fill="none" stroke="#7e5447" stroke-width="3" stroke-linecap="round" /><g class="story-art__blooms"><circle cx="131" cy="286" r="23" fill="#f2c1ad" /><circle cx="162" cy="265" r="18" fill="#fff4e4" /><circle cx="476" cy="337" r="25" fill="#efb59f" /><circle cx="510" cy="307" r="16" fill="#fff4e4" /></g>
    </g>
  </svg>
</template>

<style scoped>
.story-art { display:block;width:100%;height:auto;overflow:visible }.story-art :where(.story-art__figure,.story-art__conversation,.story-art__ingredients,.story-art__renewed){transform-origin:center bottom}.story-art__plants{transform-origin:center bottom;animation:story-sway 6s ease-in-out infinite}.story-art__steam{animation:story-float 3.2s ease-in-out infinite}.story-art__talk{animation:story-pulse 4s ease-in-out infinite}.story-art__drop{animation:story-drop 4.8s ease-in-out infinite}.story-art__flower,.story-art__blooms{transform-origin:center;animation:story-bloom 5s ease-in-out infinite}.story-art__rays{transform-origin:424px 150px;animation:story-rays 15s linear infinite}@keyframes story-sway{50%{transform:rotate(1.5deg)}}@keyframes story-float{50%{transform:translateY(-9px);opacity:.55}}@keyframes story-pulse{50%{transform:scale(1.04);opacity:.6}}@keyframes story-drop{50%{transform:translateY(10px)}}@keyframes story-bloom{50%{transform:scale(1.04)}}@keyframes story-rays{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.story-art *{animation:none!important}}
</style>
