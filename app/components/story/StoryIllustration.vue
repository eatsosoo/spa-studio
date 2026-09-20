<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ variant: 'arrival' | 'listening' | 'nature' | 'renewal' | 'finale' }>()

const branchId = `${useId()}-story-branch`
const descriptions = {
  arrival: 'Một người phụ nữ bước qua cửa vòm vào không gian spa, bên cạnh bàn gỗ và cây xanh.',
  listening: 'Khách hàng và người tư vấn ngồi đối diện, trò chuyện bên hai tách trà trong phòng sáng.',
  renewal: 'Người phụ nữ thong thả bước đi trong khu vườn ngập nắng, với dáng vẻ nhẹ nhõm.',
  finale: 'Người phụ nữ ngồi thả lỏng trên thảm, giữa ánh sáng dịu và những cành lá xanh.',
}
</script>

<template>
  <StoryNatureIllustration v-if="variant === 'nature'" />
  <div v-else class="story-art" :class="`story-art--${variant}`">
    <svg class="story-art__setting" viewBox="0 0 720 560" aria-hidden="true" focusable="false">
      <defs>
        <g :id="branchId">
          <path d="M57 194C50 151 62 105 50 38M54 111L25 82M55 143L85 112M54 171L24 146" fill="none" stroke="#7f9175" stroke-width="2" />
          <path d="M51 62C34 52 32 28 40 13C56 26 59 43 51 62Z" fill="#6f8568" />
          <path d="M54 92C53 69 66 47 84 42C86 66 74 84 54 92Z" fill="#a0b298" />
          <path d="M52 119C30 117 16 96 16 76C37 81 49 96 52 119Z" fill="#7c9575" />
          <path d="M55 149C58 125 75 108 96 106C93 130 79 144 55 149Z" fill="#6f8568" />
          <path d="M54 178C31 173 17 154 20 134C42 141 53 156 54 178Z" fill="#acbba2" />
          <path d="M56 191C67 170 83 161 102 164C92 185 75 193 56 191Z" fill="#879d7e" />
          <path d="M29 194H81L75 245H35Z" fill="#c78f7e" />
          <path d="M67 194H81L75 245H64Z" fill="#b88070" />
          <ellipse cx="55" cy="194" rx="26" ry="6" fill="#dbb09c" />
          <ellipse cx="55" cy="194" rx="20" ry="3.5" fill="#61745d" />
        </g>
      </defs>

      <template v-if="variant === 'arrival'">
        <path d="M233 494V201C233 109 293 49 380 49C467 49 527 109 527 201V494Z" fill="#dde5d7" />
        <path d="M251 493V204C251 125 304 68 380 68C456 68 509 125 509 204V493Z" fill="#faf6ec" />
        <path d="M382 69V493M251 220H509" stroke="#dedfce" stroke-width="2" />
        <path d="M382 82L475 124V492H382Z" fill="#eae6d8" />
        <path d="M459 292V324" stroke="#a49177" stroke-width="3" stroke-linecap="round" />
        <ellipse cx="395" cy="500" rx="128" ry="10" fill="#d1dac8" />
        <g class="story-art__botanical"><use :href="`#${branchId}`" transform="translate(56 207) scale(1.18)" /></g>
        <path d="M180 381H287V388H180Z" fill="#c3a88d" />
        <path d="M190 389H197L189 494H183ZM273 389H280L289 494H282Z" fill="#a78b70" />
        <path d="M212 352H240V378H212Z" fill="#ece4d4" />
        <ellipse cx="226" cy="353" rx="14" ry="4" fill="#f7f2e8" />
        <path d="M223 352C221 336 231 330 226 313M226 334C240 326 244 317 242 307C230 311 225 323 226 334M224 341C211 335 207 326 208 318C220 322 225 331 224 341" fill="#849b79" />
      </template>

      <template v-else-if="variant === 'listening'">
        <path d="M224 346V183C224 107 277 58 350 58C424 58 477 107 477 183V346Z" fill="#d9e3d3" />
        <path d="M240 331V184C240 118 287 76 350 76C414 76 461 118 461 184V331Z" fill="#f7f2e8" />
        <path d="M350 77V331M240 217H461" stroke="#dce4d5" stroke-width="3" />
        <ellipse cx="365" cy="494" rx="228" ry="13" fill="#d5dfce" />
        <g class="story-art__botanical"><use :href="`#${branchId}`" transform="translate(31 278) scale(.86)" /></g>
        <g transform="translate(579 300)">
          <path d="M0 194V35C0 16 15 0 35 0C54 0 70 16 70 35V194Z" fill="#e8e2d4" />
          <path d="M11 79H59M11 138H59" stroke="#c7c5b3" stroke-width="2" />
          <rect x="28" y="104" width="20" height="33" rx="3" fill="#a9b69d" />
          <rect x="32" y="99" width="12" height="7" rx="1" fill="#52614b" />
        </g>
      </template>

      <template v-else-if="variant === 'renewal'">
        <path d="M184 492V246C184 144 249 72 357 72C465 72 526 144 526 246V492Z" fill="#e7dfc7" />
        <circle class="story-art__sun" cx="443" cy="163" r="61" fill="#ecd09a" />
        <path d="M186 365C260 332 313 345 369 372C428 400 470 400 526 371V492H184Z" fill="#dce3d1" />
        <path d="M285 493C325 455 386 432 457 432C484 432 507 437 526 444V492Z" fill="#f3ecd9" />
        <ellipse cx="363" cy="501" rx="125" ry="9" fill="#d3d8c4" />
        <g class="story-art__botanical"><use :href="`#${branchId}`" transform="translate(88 251)" /></g>
        <g class="story-art__botanical story-art__botanical--second"><use :href="`#${branchId}`" transform="translate(615 327) scale(-.68 .68)" /></g>
        <path d="M533 137L542 132L551 137M548 119L557 114L566 119" fill="none" stroke="#879780" stroke-width="2" stroke-linecap="round" />
      </template>

      <template v-else>
        <path d="M127 493V219C127 119 205 47 314 47C421 47 501 119 501 219V493Z" fill="#dfe5d5" />
        <path d="M148 484V221C148 132 217 68 314 68C411 68 480 132 480 221V484Z" fill="#f1eadb" />
        <circle class="story-art__sun" cx="392" cy="169" r="66" fill="#e8cc99" />
        <path d="M315 72V298M149 245H479" stroke="#e3decd" stroke-width="2" />
        <ellipse cx="340" cy="495" rx="212" ry="17" fill="#b7c6aa" />
        <ellipse cx="340" cy="493" rx="182" ry="11" fill="#d6decb" />
        <g class="story-art__botanical"><use :href="`#${branchId}`" transform="translate(504 229) scale(1.1)" /></g>
        <path d="M87 453H127L122 487H91Z" fill="#dcc4a4" />
        <ellipse cx="107" cy="453" rx="20" ry="5" fill="#f7f2e8" />
        <path d="M104 449V441" stroke="#53614b" stroke-width="1.5" />
        <path d="M104 441C98 435 107 429 105 422C116 433 114 438 104 441Z" fill="#d5b171" />
      </template>

      <path d="M58 504H665" stroke="#acb9a2" stroke-width="1.2" stroke-linecap="round" />
    </svg>

    <img
      class="story-art__people"
      :src="`/images/story/${variant}.svg`"
      :alt="descriptions[variant]"
      :loading="variant === 'arrival' ? 'eager' : 'lazy'"
      decoding="async"
      width="720"
      height="560"
    >
  </div>
</template>

<style scoped>
.story-art { position: relative; width: 100%; aspect-ratio: 720 / 560; isolation: isolate; }
.story-art__setting { display: block; width: 100%; height: auto; }
.story-art__people { position: absolute; display: block; height: auto; object-fit: contain; }
.story-art--arrival .story-art__people { inset: 15% auto auto 43%; width: 30%; height: 74%; }
.story-art--listening .story-art__people { inset: 29% auto auto 15%; width: 72%; height: 60%; }
.story-art--renewal .story-art__people { inset: 15% auto auto 38%; width: 33%; height: 74%; }
.story-art--finale .story-art__people { inset: 27% auto auto 26%; width: 43%; height: 63%; }
.story-art__botanical { transform-origin: 50% 90%; animation: story-botanical 8s ease-in-out infinite; }
.story-art__botanical--second { animation-delay: -3s; }
.story-art__sun { transform-box: fill-box; transform-origin: center; animation: story-sun 10s ease-in-out infinite; }
@keyframes story-botanical { 50% { transform: rotate(.8deg); } }
@keyframes story-sun { 50% { transform: scale(1.025); } }
@media (prefers-reduced-motion: reduce) {
  .story-art__botanical, .story-art__sun { animation: none; }
}
</style>
