<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{ progress?: number }>(), { progress: 1 })
const uid = useId()
const titleId = `${uid}-treatment-title`
const descriptionId = `${uid}-treatment-description`
const progress = computed(() => Number.isFinite(props.progress) ? Math.min(1, Math.max(0, props.progress)) : 1)
</script>

<template>
  <svg
    class="story-treatment"
    viewBox="0 0 720 560"
    width="720"
    height="560"
    role="img"
    :aria-labelledby="`${titleId} ${descriptionId}`"
    :style="{ '--treatment-progress': progress }"
    focusable="false"
  >
    <title :id="titleId">Nghỉ ngơi trong một nghi thức chăm sóc tại MIÊN</title>
    <desc :id="descriptionId">Một người phụ nữ nằm nghiêng thư giãn trên ghế chăm sóc, mắt khép nhẹ, đầu quấn khăn và cơ thể phủ khăn xanh. Bên cạnh là nến, tinh dầu và một cành hoa trắng.</desc>

    <g aria-hidden="true">
      <!-- A quiet architectural setting keeps the silhouette of the person clear. -->
      <path d="M202 365V218C202 125 263 80 341 80C420 80 480 128 480 218V365Z" fill="#e6ebe1" />
      <path d="M219 349V220C219 141 271 97 341 97C411 97 463 143 463 220V349Z" fill="#f7f2e8" />
      <path d="M341 98V347M220 224H462" fill="none" stroke="#e6ebe1" stroke-width="3" />
      <path d="M69 465H660" fill="none" stroke="#c7cfc2" stroke-width="1.5" />
      <ellipse cx="369" cy="453" rx="242" ry="12" fill="#dde5d7" />

      <!-- The botanical branch is drawn as a stem with alternating, shaped leaves. -->
      <g data-part="botanical-branch">
        <path d="M617 407C616 337 628 283 623 188M620 311C605 289 590 268 574 252M622 274C640 251 652 226 660 199M620 350C640 329 652 312 657 292" fill="none" stroke="#81927b" stroke-width="2" />
        <path d="M623 234C604 222 604 196 615 180C629 194 632 216 623 234Z" fill="#6f8568" />
        <path d="M624 256C632 232 650 220 669 222C664 243 647 256 624 256Z" fill="#91a389" />
        <path d="M608 293C582 289 570 272 569 249C591 254 606 269 608 293Z" fill="#6f8568" />
        <path d="M641 244C640 223 647 203 662 192C669 215 661 233 641 244Z" fill="#b0bca6" />
        <path d="M620 334C599 327 590 310 591 290C611 299 621 312 620 334Z" fill="#a1b298" />
        <path d="M638 327C636 306 644 290 663 281C666 301 657 319 638 327Z" fill="#6f8568" />
        <path d="M620 371C634 350 652 343 671 347C659 369 640 377 620 371Z" fill="#91a389" />
        <path d="M593 399H642L636 451C635 458 628 461 618 461C608 461 601 458 600 451Z" fill="#c78f7e" />
        <path d="M618 400H642L636 451C635 458 628 461 618 461Z" fill="#b77c6e" />
        <ellipse cx="617.5" cy="399" rx="24.5" ry="7" fill="#daaa98" />
        <ellipse cx="617.5" cy="399" rx="19" ry="4" fill="#687560" />
      </g>

      <!-- Warm timber legs and a single upholstered reclining surface. -->
      <g data-part="chaise">
        <path d="M311 392H329L295 453H282Z" fill="#a48168" />
        <path d="M551 392H568L588 453H575Z" fill="#a48168" />
        <path d="M307 417H573V423H304Z" fill="#c3a58a" />
        <path d="M164 262C159 253 162 242 171 238C180 234 189 238 196 247L307 363C317 373 328 377 344 377H579C588 377 595 384 595 392V402H345C323 402 310 397 295 382L165 277Z" fill="#d1cbbd" />
        <path d="M163 259C158 250 163 241 171 238C180 234 189 238 196 247L307 359C317 369 328 374 344 374H579C588 374 595 379 595 387C595 395 588 397 578 397H344C326 397 313 392 299 378L166 272Z" fill="#f7f2e8" />
        <path d="M175 251L307 381C319 392 330 392 347 392H580" fill="none" stroke="#e4ddcf" stroke-width="2" />
        <path d="M187 256C184 249 188 242 195 241L222 244C233 246 244 258 248 268L233 280C219 282 196 268 187 256Z" fill="#dde5d7" />
      </g>

      <g data-part="woman">
        <!-- The far leg and foot remain distinct from the near leg. -->
        <path d="M476 350C503 351 527 353 548 358L568 358C575 356 580 352 586 353C590 354 589 358 585 361L577 367L584 369C588 371 587 375 582 376L562 375C550 373 542 372 531 372L481 369Z" fill="#cf927e" />
        <path d="M480 361C506 362 529 366 549 372L563 371C570 370 575 365 580 366C584 367 583 371 579 374L576 376L588 378C593 379 594 383 590 385C585 388 576 386 569 386L556 383C547 381 540 382 530 381L483 378Z" fill="#e5b5a1" />
        <path d="M579 379L587 381M575 381L582 383" fill="none" stroke="#cf927e" stroke-width="1.2" stroke-linecap="round" />

        <!-- Neck, shoulder and upper body follow the angle of the backrest. -->
        <path d="M245 259L267 259C268 269 272 278 283 283C302 290 308 304 320 317L354 339L334 361C311 344 296 328 283 312C274 301 258 294 251 282Z" fill="#e5b5a1" />
        <path d="M245 259L266 259C266 270 274 278 282 283C267 282 256 276 250 269Z" fill="#cf927e" />
        <path d="M281 291C294 294 300 301 305 309" fill="none" stroke="#cf927e" stroke-width="1.8" stroke-linecap="round" />

        <!-- Linen describes the seated hip and two extended legs without a hard outline. -->
        <path d="M301 303C312 309 321 318 332 325C345 332 355 335 369 333L420 329C441 329 450 337 467 343L539 361C545 363 549 369 547 376L544 387L417 382C393 382 370 384 353 377C333 369 318 353 309 339L295 316Z" fill="#6f8568" />
        <path d="M311 312C327 329 341 339 359 343C377 347 407 339 431 342L477 356L540 369L538 379L427 375C402 373 376 376 359 371C337 365 319 345 308 326Z" fill="#839679" />
        <path d="M354 341C369 345 379 350 386 361L397 380L416 382C408 361 405 347 418 331L370 334Z" fill="#63795c" />
        <path d="M429 332C440 336 443 345 446 357L456 382L473 383C466 365 460 349 459 340Z" fill="#63795c" />
        <path d="M313 320C321 330 329 338 340 344M419 350L440 367M483 364L519 373" fill="none" stroke="#a4b298" stroke-width="2" stroke-linecap="round" />
        <path d="M541 362L538 383" fill="none" stroke="#566c50" stroke-width="2" />

        <!-- A bent arm settles naturally at the waist; the hand has a separate thumb. -->
        <path d="M272 286C279 283 287 286 291 292L315 326C318 330 321 331 326 331L354 326C358 324 360 320 364 318C367 317 369 319 367 322L364 327L376 325C381 324 382 327 378 329L367 333L379 331C384 331 384 334 380 335L367 339C361 341 356 339 351 339L321 347C311 350 303 346 297 339L268 307C262 300 263 291 272 286Z" fill="#e5b5a1" />
        <path d="M275 304L304 337C309 342 314 343 320 342L351 335" fill="none" stroke="#cf927e" stroke-width="1.7" stroke-linecap="round" />
        <path d="M360 331L367 330M362 335L369 333" fill="none" stroke="#cf927e" stroke-width="1.1" stroke-linecap="round" />

        <!-- A small, three-quarter profile sits at an adult proportion to the body. -->
        <g transform="rotate(-39 241 243)">
          <path d="M217 253C207 247 206 232 209 219C212 204 223 194 237 195C251 195 262 205 264 218L258 241L240 258Z" fill="#303c35" />
          <path d="M222 215C230 205 247 207 254 217C259 224 258 232 260 237L267 246C269 249 266 251 260 251L259 257L262 260C262 263 259 264 256 265C253 272 248 276 239 275L230 270C226 262 221 254 218 244C214 232 215 223 222 215Z" fill="#e5b5a1" />
          <path d="M239 274C247 275 253 272 256 266L255 272C250 279 243 281 235 277Z" fill="#cf927e" />
          <path d="M216 237C209 235 207 240 210 247C212 252 216 254 220 252L221 241Z" fill="#e5b5a1" />
          <path d="M213 241C216 239 219 244 217 247" fill="none" stroke="#cf927e" stroke-width="1.3" stroke-linecap="round" />

          <g data-part="facial-mask" class="story-treatment__mask">
            <path d="M229 220C236 215 248 216 252 223L254 237L259 246L253 249L255 254C248 252 243 256 242 263C233 260 228 252 226 244C224 233 225 226 229 220Z" fill="#c7d6b7" />
            <path d="M232 223C237 220 243 220 247 223" fill="none" stroke="#e1e8d5" stroke-width="2" stroke-linecap="round" />
          </g>
          <path d="M244 234C247 232 251 233 254 235" fill="none" stroke="#685c50" stroke-width="1.4" stroke-linecap="round" />
          <path d="M243 240C246 243 250 243 253 241M251 242L253 244" fill="none" stroke="#303c35" stroke-width="1.4" stroke-linecap="round" />
          <path d="M255 259L260 260" fill="none" stroke="#ad6b65" stroke-width="1.4" stroke-linecap="round" />
          <path d="M251 248L252 250" fill="none" stroke="#cf927e" stroke-width="1.2" stroke-linecap="round" />

          <g data-part="cucumber-slices" class="story-treatment__cucumber" transform="rotate(11 248 241)">
            <ellipse cx="248" cy="241" rx="8.5" ry="6.5" fill="#7f9d74" />
            <ellipse cx="248" cy="241" rx="6.8" ry="4.9" fill="#e0e7c8" />
            <path d="M247 238L248 240L250 238M244 241L247 241M249 242L252 243M247 242L246 244" fill="none" stroke="#a6be8e" stroke-width="1.1" stroke-linecap="round" />
          </g>

          <g data-part="hair-towel">
            <path d="M213 239C204 233 203 219 208 207C213 193 228 187 242 193C254 191 264 199 265 210C266 218 261 223 256 227L243 218C234 216 225 224 221 237Z" fill="#dde5d7" />
            <path d="M216 236C218 218 234 205 257 207L262 213C243 212 229 222 222 239Z" fill="#f7f2e8" />
            <path d="M208 220C214 208 225 204 237 202C242 201 244 197 242 193C228 187 214 194 208 207Z" fill="#edf0e6" />
            <path d="M212 222C218 211 228 207 240 206M222 232C231 220 243 215 254 216" fill="none" stroke="#c4cebd" stroke-width="1.4" stroke-linecap="round" />
          </g>
        </g>
      </g>

      <g data-part="side-table">
        <path d="M98 386H106L93 461H87ZM172 386H180L190 461H184Z" fill="#a48168" />
        <path d="M92 436H185V441H91Z" fill="#c3a58a" />
        <path d="M78 377H196V384C196 392 170 397 137 397C104 397 78 392 78 384Z" fill="#b99b7f" />
        <ellipse cx="137" cy="377" rx="59" ry="14" fill="#dcc5a9" />
        <ellipse cx="132" cy="378" rx="39" ry="7" fill="#cab091" />
      </g>

      <g data-part="candle">
        <path d="M96 338H125V374C125 380 96 380 96 374Z" fill="#f7f2e8" />
        <path d="M118 339H125V374C125 377 121 378 118 378Z" fill="#e7ddc9" />
        <ellipse cx="110.5" cy="338" rx="14.5" ry="4" fill="#e7ddc9" />
        <ellipse cx="110.5" cy="338" rx="11" ry="2.5" fill="#f7f2e8" />
        <path d="M111 338V331" fill="none" stroke="#5b6555" stroke-width="1.4" />
        <g data-part="candle-flame" class="story-treatment__flame">
          <path d="M111 331C102 327 104 320 109 313C111 309 112 306 111 303C122 315 122 326 111 331Z" fill="#d8b56d" />
          <path d="M111 330C107 326 110 321 113 317C115 325 115 328 111 330Z" fill="#fff2cb" />
        </g>
      </g>

      <g data-part="skincare-bottle">
        <path d="M148 340H166V350L171 358V378C171 383 143 383 143 378V358L148 350Z" fill="#acb59b" />
        <path d="M161 350H166L171 358V378C171 381 167 382 164 382V359Z" fill="#8e9c7d" />
        <rect x="147" y="338" width="20" height="11" rx="2" fill="#303c35" />
        <rect x="146" y="359" width="22" height="17" rx="1" fill="#f7f2e8" />
        <path d="M157 372C151 369 151 365 155 363C159 364 160 368 157 372ZM158 371C156 367 160 365 164 366C163 370 161 372 158 371Z" fill="#81927b" />
      </g>

      <g data-part="flowers" class="story-treatment__flowers">
        <path d="M505 424C522 412 538 404 558 401M530 409C531 398 530 390 526 383M540 406C546 410 552 413 559 414" fill="none" stroke="#81927b" stroke-width="1.5" stroke-linecap="round" />
        <path d="M518 415C517 405 521 399 528 395C531 405 527 412 518 415Z" fill="#a1b298" />
        <path d="M538 406C541 395 548 391 556 393C552 402 546 407 538 406Z" fill="#6f8568" />
        <path d="M526 384C515 383 511 376 516 372C521 369 525 374 527 379C522 370 525 364 530 367C535 370 532 376 529 380C536 373 543 375 542 380C541 385 535 386 529 383C536 388 536 394 532 394C527 394 525 389 527 383C522 390 516 390 515 386C514 382 520 381 526 384Z" fill="#f7f2e8" />
        <path d="M560 402C551 398 551 392 555 391C560 390 562 395 562 399C563 390 568 387 571 391C574 395 569 399 565 401C574 399 579 403 576 407C573 410 568 406 564 403C566 412 562 416 558 412C555 409 558 404 560 402Z" fill="#f7f2e8" />
        <circle cx="528" cy="382" r="2.5" fill="#d8b56d" />
        <circle cx="563" cy="402" r="2.5" fill="#d8b56d" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.story-treatment {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  overflow: visible;
  pointer-events: none;
}

.story-treatment__mask,
.story-treatment__cucumber,
.story-treatment__flame,
.story-treatment__flowers {
  transition: opacity 350ms ease;
}

.story-treatment__mask {
  opacity: clamp(0, (var(--treatment-progress) - .16) * 5, 1);
}

.story-treatment__cucumber {
  opacity: clamp(0, (var(--treatment-progress) - .34) * 5, 1);
}

.story-treatment__flame {
  opacity: clamp(0, (var(--treatment-progress) - .5) * 5, 1);
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: treatment-candle 3s ease-in-out infinite;
}

.story-treatment__flowers {
  opacity: clamp(0, (var(--treatment-progress) - .65) * 4, 1);
}

@keyframes treatment-candle {
  50% { transform: scale(.94, 1.04); }
}

@media (prefers-reduced-motion: reduce) {
  .story-treatment__mask,
  .story-treatment__cucumber,
  .story-treatment__flame,
  .story-treatment__flowers {
    opacity: 1;
    animation: none;
    transition: none;
  }
}
</style>
