<script setup lang="ts">
import { computed, useId } from 'vue'

/** Size is the preferred width; the SVG always shrinks to fit its parent. */
const props = withDefaults(defineProps<{
  size?: number | string
  animated?: boolean
  primaryColor?: string
}>(), {
  size: 520,
  animated: true,
  primaryColor: '#46533f',
})

const resolvedSize = computed(() => typeof props.size === 'number' ? props.size + 'px' : props.size)
const uid = useId()
const clipId = uid + '-scene'
const flowerId = uid + '-flower'
const cucumberId = uid + '-cucumber'
const titleId = uid + '-title'
const descId = uid + '-description'
</script>

<template>
    <svg
    class="spa-illustration"
    :class="{ 'is-static': !animated }"
    :style="{ width: resolvedSize, '--spa-primary': primaryColor }"
    viewBox="0 0 520 500"
    width="520"
    height="500"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-labelledby="titleId + ' ' + descId"
    focusable="false"
  >
    <title :id="titleId">Một khoảng thư giãn tại MIÊN Spa</title>
    <desc :id="descId">Người phụ nữ nằm thư giãn trong làn nước xanh, quấn khăn, đắp mặt nạ với hai lát dưa leo trên mắt. Xung quanh có lá nhiệt đới, hoa trắng, nến và chai dưỡng da.</desc>
      <defs>
        <clipPath :id="clipId"><path d="M67 155C88 111 125 111 160 79C198 44 244 29 280 51C310 69 318 103 357 117C411 136 465 159 477 216C494 291 468 369 416 409C365 449 286 468 216 466C133 464 61 429 41 366C21 305 30 215 67 155Z" /></clipPath>
        <g :id="flowerId">
          <path v-for="angle in [0, 72, 144, 216, 288]" :key="angle" d="M0 5C-22 3-24-15-11-20C-1-23 4-12 0 5Z" fill="#fffaf0" :transform="'rotate(' + angle + ')'" />
          <circle r="6" fill="#efbd68" /><circle r="2.5" fill="#d78b57" />
        </g>
        <g :id="cucumberId">
          <circle r="21" fill="#5cad68" /><circle r="18.5" fill="#d4ecad" /><circle r="15" fill="#f0f4d0" />
          <ellipse v-for="angle in [0, 60, 120, 180, 240, 300]" :key="angle" cy="-9" rx="2.1" ry="4" fill="#a2cd86" :transform="'rotate(' + angle + ')'" />
          <circle r="3" fill="#d4e6b1" />
        </g>
      </defs>
      <g data-part="background-blob" class="spa-blob" aria-hidden="true">
        <path d="M67 155C88 111 125 111 160 79C198 44 244 29 280 51C310 69 318 103 357 117C411 136 465 159 477 216C494 291 468 369 416 409C365 449 286 468 216 466C133 464 61 429 41 366C21 305 30 215 67 155Z" fill="#b3d8dc" />
      </g>
      <!-- Clip only the water, so the person and accessories stay fully visible. -->
      <g data-part="water" :clip-path="'url(#' + clipId + ')'" aria-hidden="true">
        <path d="M0 242C99 186 168 264 264 204S437 128 520 197V500H0Z" fill="#88bfca" />
        <path d="M0 363C106 320 390 312 520 369V500H0Z" fill="#71aeba" />
        <g class="spa-ripple"><ellipse cx="105" cy="302" rx="32" ry="11" fill="none" stroke="#e8f7ef" stroke-width="2" /></g>
        <g class="spa-ripple spa-ripple--second"><ellipse cx="397" cy="377" rx="37" ry="12" fill="none" stroke="#e8f7ef" stroke-width="2" /></g>
      </g>
      <g aria-hidden="true">
        <g data-part="leaves" class="spa-leaves">
          <path d="M144 285C127 253 105 246 112 222C79 215 94 189 80 173C108 147 131 164 136 140C166 144 164 172 182 182L174 283Z" fill="#64b685" />
          <path d="M152 280C149 249 121 239 134 217C114 191 141 184 132 157C160 160 160 183 175 192L182 272Z" fill="#399b72" />
          <path d="M310 255C326 225 318 210 330 192C310 170 333 157 333 133C352 132 361 151 379 149C394 170 380 183 391 201C372 219 388 239 371 263Z" fill="#79c391" />
          <path d="M339 259C351 240 340 222 353 208C341 189 360 177 350 150C375 158 361 181 377 193C362 217 378 231 360 254Z" fill="#43a676" />
        </g>
        <g data-part="bath-tray" transform="rotate(-8 264 280)">
          <rect x="143" y="215" width="225" height="214" rx="24" fill="#847b79" />
          <rect x="154" y="221" width="203" height="202" rx="17" fill="#a59790" />
          <path d="M155 271H357M155 319H357M155 367H357M155 415H357" stroke="#887c79" stroke-width="4" />
          <rect x="184" y="212" width="144" height="84" rx="34" fill="#c7b5a6" />
        </g>

        <!-- Connected shoulders, neck and arms move together with the face. -->
        <g data-part="woman">
          <g class="spa-shoulders">
          <path d="M234 254L232 278C221 288 198 284 181 297C162 311 158 333 150 361L129 439L159 448L191 358L184 431Q264 461 345 431L325 353L356 426L383 413L352 328C344 303 329 290 304 287L279 279L276 249Z" fill="#efb57f" />
          <path d="M234 252L277 253L279 272C265 286 246 283 233 272Z" fill="#da9769" />
          <path d="M203 302C218 300 230 305 240 312M273 311C285 301 298 300 310 303" fill="none" stroke="#d7996d" stroke-width="3" stroke-linecap="round" />
          <path d="M188 352C218 326 282 318 320 339L337 437Q259 463 180 440Z" fill="var(--spa-primary)" />
          <path d="M188 352C217 337 252 331 278 331L288 450Q230 460 180 440Z" fill="var(--spa-light)" />
          <path d="M293 332C304 333 313 336 320 339L337 437L316 444Z" fill="var(--spa-dark)" />
          <path d="M194 363C213 352 240 345 259 345" fill="none" stroke="var(--spa-highlight)" stroke-width="4" stroke-linecap="round" />
          <path d="M142 415L135 438M368 391L376 411" fill="none" stroke="#d7996d" stroke-width="3" stroke-linecap="round" />
          </g>
          <g class="spa-head"><g transform="rotate(-8 251 218)">
            <g data-part="hair-towel">
            <path d="M184 213C165 194 172 164 185 143C190 132 188 117 199 103C214 83 244 85 260 99C284 95 299 114 298 135C317 149 322 172 309 195L299 225Z" fill="var(--spa-primary)" />
            <path d="M185 197C181 172 207 150 217 123C225 101 247 105 256 115C229 133 229 152 211 166Z" fill="var(--spa-light)" />
            </g>
            <path d="M184 207C177 224 184 248 198 247L203 214ZM299 204C316 217 309 243 298 244L290 214Z" fill="#e7a373" />
            <path d="M198 183C207 160 275 159 291 184C302 204 298 238 286 255C277 270 265 280 250 280C234 280 216 267 207 252C196 234 191 207 198 183Z" fill="#f3c28a" />
            <g data-part="facial-mask">
            <path d="M204 188C215 175 229 179 243 175C261 173 278 174 288 189L290 224C291 240 278 259 267 265C260 254 244 254 234 263C217 253 207 240 205 224Z" fill="#9ed17e" />
            <path d="M210 190C219 182 225 184 232 182M279 232C277 243 272 248 268 250" fill="none" stroke="#bce199" stroke-width="5" stroke-linecap="round" />
            </g>
            <path d="M245 222L241 235Q249 242 256 235" fill="#efb57f" />
            <path d="M237 250Q248 241 259 248Q252 260 241 255Z" fill="#d96560" />
            <path d="M240 250Q248 251 255 249" fill="none" stroke="#fff0d8" stroke-width="2" stroke-linecap="round" />
            <g data-part="cucumber-slices">
              <g class="spa-cucumber"><use :href="'#' + cucumberId" x="220" y="212" /></g>
              <g class="spa-cucumber spa-cucumber--second"><use :href="'#' + cucumberId" x="274" y="208" /></g>
            </g>
            <g data-part="hair-towel-fold">
            <path d="M191 195C204 172 220 160 238 148C258 156 283 159 299 184C293 154 267 139 245 134C224 145 202 155 191 195Z" fill="var(--spa-highlight)" />
            <path d="M196 186C209 166 229 154 244 145C265 151 281 159 291 172" fill="none" stroke="var(--spa-dark)" stroke-width="5" stroke-linecap="round" />
            </g>
          </g></g>
        </g>

        <g data-part="towel-tray" transform="rotate(-10 433 249)">
          <rect x="395" y="198" width="82" height="98" rx="5" fill="#dda663" />
          <path d="M403 204V287M466 204V287" stroke="#ecc38b" stroke-width="4" />
          <rect x="411" y="224" width="34" height="60" rx="14" fill="#58ad8d" />
          <ellipse cx="428" cy="236" rx="14" ry="17" fill="#79c3a0" />
          <path d="M430 248C417 249 417 223 429 225C439 227 438 242 430 241C425 240 425 233 429 232" fill="none" stroke="#419779" stroke-width="2.5" />
          <rect x="438" y="211" width="27" height="57" rx="12" fill="#409d82" />
          <ellipse cx="451" cy="222" rx="11" ry="14" fill="#76bf9b" />
          <path d="M452 233C442 231 444 211 451 213C459 215 458 228 451 227L451 220" fill="none" stroke="#388f76" stroke-width="2" />
        </g>
        <g data-part="candle" transform="rotate(-10 99 373)">
          <ellipse cx="97" cy="383" rx="57" ry="23" fill="#b28258" />
          <ellipse cx="97" cy="376" rx="57" ry="21" fill="#dfb67e" />
          <ellipse cx="111" cy="370" rx="20" ry="8" fill="#ac8268" />
          <rect x="97" y="321" width="27" height="48" rx="5" fill="#fff6df" />
          <ellipse cx="110.5" cy="322" rx="13.5" ry="5" fill="#eadabe" />
          <path d="M110 321V312" stroke="#6c6658" stroke-width="2" />
          <g class="spa-flame"><path d="M110 315C95 307 109 296 109 284C126 300 125 310 110 315Z" fill="#efa64e" /><path d="M111 313C105 308 110 302 113 297C120 307 117 311 111 313Z" fill="#ffe5a0" /></g>
        </g>
        <g data-part="water-highlights-and-bubbles">
        <g class="spa-water-highlights" fill="none" stroke="#fffaf0" stroke-width="5" stroke-linecap="round">
          <path d="M72 284C104 269 48 272 66 255C88 239 112 244 91 229" />
          <path d="M55 256C25 242 93 235 69 219C52 210 61 203 76 197" />
        </g>
        <g class="spa-water-highlights spa-water-highlights--second" fill="none" stroke="#fffaf0" stroke-width="3" stroke-linecap="round"><path d="M109 294C129 278 95 278 113 260" /></g>
        <g class="spa-bubble"><circle cx="376" cy="301" r="5" /></g>
        <g class="spa-bubble spa-bubble--second"><circle cx="85" cy="175" r="4" /></g>
        <g class="spa-bubble spa-bubble--third"><circle cx="412" cy="397" r="6" /></g>
        </g>
        <g data-part="skincare-bottle" transform="rotate(8 405 170)">
          <rect x="390" y="133" width="30" height="17" rx="4" fill="#f7f4e4" />
          <rect x="386" y="149" width="38" height="57" rx="10" fill="#e5ebca" />
          <rect x="389" y="167" width="32" height="23" rx="3" fill="#fffaf0" />
          <path d="M405 184C393 178 402 170 411 173C412 180 408 183 405 184Z" fill="#759273" />
        </g>
      </g>
      <g data-part="flowers" aria-hidden="true">
      <g class="spa-flower">
        <path d="M134 124C113 116 111 98 115 89C132 92 139 110 134 124M137 127C150 105 168 108 173 111C168 127 151 134 137 127" fill="#65b988" />
        <use :href="'#' + flowerId" transform="translate(137 122) scale(.8)" />
      </g>
      <g class="spa-flower spa-flower--bottom">
        <path d="M427 347C406 343 405 322 409 317C424 323 430 335 427 347M429 350C445 334 458 340 462 345C451 356 439 357 429 350" fill="#56aa82" />
        <use :href="'#' + flowerId" transform="translate(429 343) scale(.78)" />
      </g>
      <use :href="'#' + flowerId" transform="translate(69 359) scale(.66)" />
      </g>
    </svg>
</template>

<style scoped>
/* No background fill outside the blob; explicit dimensions reserve layout space. */
.spa-illustration {
  --spa-light: color-mix(in srgb, var(--spa-primary) 82%, white);
  --spa-dark: color-mix(in srgb, var(--spa-primary) 82%, #263124);
  --spa-highlight: color-mix(in srgb, var(--spa-primary) 65%, white);
  display: block;
  max-width: 100%;
  height: auto;
  aspect-ratio: 520 / 500;
  flex: none;
  pointer-events: none;
}
.spa-blob, .spa-shoulders, .spa-head, .spa-leaves, .spa-flower,
.spa-water-highlights, .spa-ripple, .spa-flame, .spa-cucumber, .spa-bubble {
  transform-box: fill-box;
  transform-origin: center;
}
.spa-blob { animation: spa-blob 11s ease-in-out infinite; }
.spa-shoulders { transform-origin: center bottom !important; animation: spa-breathe 7s ease-in-out infinite; }
.spa-head { animation: spa-rest 8.5s ease-in-out infinite; }
.spa-leaves { transform-origin: center bottom !important; animation: spa-sway 5.6s ease-in-out infinite; }
.spa-flower { animation: spa-float 4.8s ease-in-out infinite; }
.spa-flower--bottom { animation-duration: 5.7s; animation-delay: -2.8s; }
.spa-water-highlights { animation: spa-water 6.4s ease-in-out infinite; }
.spa-water-highlights--second { animation-duration: 5.3s; animation-delay: -2.7s; }
.spa-ripple { opacity: 0; animation: spa-ripple 6.8s ease-in-out infinite; }
.spa-ripple--second { animation-duration: 5.8s; animation-delay: -3s; }
.spa-flame { transform-origin: center bottom !important; animation: spa-flame 1.2s ease-in-out infinite alternate; }
.spa-cucumber { animation: spa-cucumber 13s ease-in-out infinite; }
.spa-cucumber--second { animation-duration: 16s; animation-delay: -6s; }
.spa-bubble { fill: none; stroke: #f4fcf3; stroke-width: 2; opacity: 0; animation: spa-bubble 5.5s ease-in-out infinite; }
.spa-bubble--second { animation-duration: 6.7s; animation-delay: -2.3s; }
.spa-bubble--third { animation-duration: 4.8s; animation-delay: -3.6s; }

@keyframes spa-blob { 0%, 100% { transform: scale(.99); } 50% { transform: scale(1.01); } }
@keyframes spa-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.008); } }
@keyframes spa-rest { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes spa-sway { 0%, 100% { transform: translateX(-2px) rotate(-.4deg); } 50% { transform: translateX(2px) rotate(.4deg); } }
@keyframes spa-float { 0%, 100% { transform: translateY(2px); } 50% { transform: translateY(-2px); } }
@keyframes spa-water { 0%, 100% { transform: translateX(-4px); opacity: .65; } 50% { transform: translateX(4px); opacity: .9; } }
@keyframes spa-ripple { 0% { transform: scale(.7); opacity: 0; } 25% { opacity: .5; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes spa-flame { 0% { transform: scale(.96, 1) rotate(-2deg); } 32% { transform: scale(1.02, .95) rotate(1deg); } 71% { transform: scale(.97, 1.04) rotate(-1deg); } 100% { transform: scale(1, .98) rotate(2deg); } }
@keyframes spa-cucumber { 0%, 65%, 100% { transform: rotate(0) translateY(0); } 80% { transform: rotate(2deg) translateY(-.8px); } }
@keyframes spa-bubble { 0% { transform: translateY(5px) scale(.8); opacity: 0; } 25% { opacity: .6; } 100% { transform: translateY(-24px) scale(1.08); opacity: 0; } }

/* Stopping motion leaves a complete, readable static composition. */
.is-static g { animation: none !important; }
.is-static .spa-ripple, .is-static .spa-bubble { opacity: .35; }
@media (prefers-reduced-motion: reduce) {
  .spa-illustration g { animation: none !important; }
  .spa-ripple, .spa-bubble { opacity: .35; }
}
</style>
