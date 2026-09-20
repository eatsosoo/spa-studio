<script setup lang="ts">
withDefaults(defineProps<{ animated?: boolean }>(), { animated: true })

const uid = useId()
const titleId = `${uid}-nature-title`
const descriptionId = `${uid}-nature-description`
</script>

<template>
  <svg
    class="story-nature"
    :class="{ 'story-nature--animated': animated }"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 720 560"
    role="img"
    :aria-labelledby="`${titleId} ${descriptionId}`"
    focusable="false"
  >
    <title :id="titleId">Nguyên liệu tự nhiên trong nghi thức chăm sóc của MIÊN</title>
    <desc :id="descriptionId">Chai tinh dầu màu hổ phách, bát nước gốm, đá massage, khăn linen và một bông hoa nằm bên những cành lá xanh thanh mảnh.</desc>

    <g data-part="display-plinths">
      <path d="M62 490H661" fill="none" stroke="#d4d9ca" stroke-width="1.5" stroke-linecap="round" />
      <path d="M97 437V469C97 493 173 511 267 511S437 493 437 469V437Z" fill="#ded6c8" />
      <ellipse cx="267" cy="437" rx="170" ry="42" fill="#ede6d8" />
      <path d="M425 462V482C425 498 477 510 541 510S657 498 657 482V462Z" fill="#cbd4c4" />
      <ellipse cx="541" cy="462" rx="116" ry="29" fill="#e3e8db" />
    </g>

    <g data-part="botanical-branches" class="story-nature__branch">
      <path d="M486 397C492 330 518 270 540 218C559 173 570 139 571 101M524 257C499 229 476 213 447 197M541 215C574 202 596 185 611 163" fill="none" stroke="#6f8568" stroke-width="2.4" stroke-linecap="round" />
      <path d="M572 136C554 125 550 108 555 89C570 96 579 112 572 136Z" fill="#8da285" />
      <path d="M569 155C577 133 591 123 609 124C605 144 590 157 569 155Z" fill="#6f8568" />
      <path d="M560 183C540 176 530 160 531 140C549 145 563 159 560 183Z" fill="#6f8568" />
      <path d="M551 207C564 185 580 180 597 182C591 201 574 212 551 207Z" fill="#a8bca7" />
      <path d="M537 238C515 230 507 214 508 194C527 201 539 216 537 238Z" fill="#8da285" />
      <path d="M522 272C532 251 550 240 571 243C562 263 546 274 522 272Z" fill="#6f8568" />
      <path d="M511 300C489 292 479 275 480 254C500 261 512 278 511 300Z" fill="#a8bca7" />
      <path d="M502 331C518 310 535 304 555 310C543 328 527 337 502 331Z" fill="#8da285" />
      <path d="M483 222C461 224 446 216 437 201C456 195 474 201 483 222Z" fill="#6f8568" />
      <path d="M499 236C495 215 484 201 467 195C465 214 477 230 499 236Z" fill="#a8bca7" />
      <path d="M589 185C585 166 592 151 604 141C612 159 605 175 589 185Z" fill="#8da285" />
      <path d="M598 176C617 177 631 170 638 155C619 151 606 159 598 176Z" fill="#6f8568" />
      <path d="M569 135L562 107M560 181L538 151M537 237L516 207M511 300L488 268M502 331L539 318" fill="none" stroke="#f7f2e8" stroke-width="1" stroke-linecap="round" />
    </g>

    <g data-part="linen">
      <path d="M117 375L230 359L280 389L168 407Z" fill="#f7f2e8" />
      <path d="M117 375L168 407V445L117 416Z" fill="#d8cdba" />
      <path d="M168 407L280 389V427L168 445Z" fill="#ebe3d5" />
      <path d="M123 389L168 416L274 399M123 402L168 430L274 413" fill="none" stroke="#c5bba9" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M138 373L182 400M150 371L195 398M162 370L207 395" fill="none" stroke="#e0d7c8" stroke-width="1" />
      <path d="M176 417L176 426M184 416L184 425M192 415L192 424M200 414L200 422" fill="none" stroke="#d8cdba" stroke-width="1" />
    </g>

    <g data-part="essential-oil-bottle">
      <ellipse cx="283" cy="441" rx="65" ry="13" fill="#d3c5ae" />
      <path d="M261 217V199H306V217C306 226 328 232 331 253V424C331 437 320 443 283 443S235 437 235 424V253C238 232 261 226 261 217Z" fill="#bd9565" />
      <path d="M313 240C322 245 324 251 324 263V423C324 431 312 435 295 436V240Z" fill="#a47b4c" />
      <path d="M245 258V414C245 422 248 426 253 427V251C249 252 246 254 245 258Z" fill="#dfbc8e" />
      <path d="M261 217H306" fill="none" stroke="#d4ac7a" stroke-width="3" />
      <rect x="256" y="172" width="55" height="35" rx="5" fill="#303c35" />
      <path d="M264 180V200M272 180V200M280 180V200M288 180V200M296 180V200M304 180V200" stroke="#59645a" stroke-width="1.5" stroke-linecap="round" />
      <path d="M269 173V132C269 119 274 109 283 109S298 119 298 132V173Z" fill="#424f44" />
      <path d="M276 130C276 121 279 117 282 116" fill="none" stroke="#72816f" stroke-width="3" stroke-linecap="round" />
      <rect x="252" y="287" width="62" height="106" rx="2" fill="#f7f2e8" />
      <path d="M280 350C286 337 286 326 282 311M283 339C269 338 266 331 267 324C278 324 283 329 283 339ZM285 332C296 328 301 321 298 315C289 317 284 323 285 332Z" fill="none" stroke="#6f8568" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M266 367H300M274 375H292" fill="none" stroke="#bd9565" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <g data-part="ceramic-bowl">
      <ellipse cx="418" cy="449" rx="67" ry="11" fill="#d3c5ae" />
      <path d="M331 380C335 422 358 450 418 450S501 422 505 380Z" fill="#d7c7af" />
      <path d="M342 396C353 424 373 438 411 440" fill="none" stroke="#eee3d1" stroke-width="5" stroke-linecap="round" />
      <path d="M458 442C485 432 498 410 502 390C487 410 471 420 445 425Z" fill="#c3b296" />
      <ellipse cx="418" cy="380" rx="87" ry="26" fill="#f7f2e8" />
      <ellipse cx="418" cy="381" rx="76" ry="19" fill="#a8bca7" />
      <path d="M343 381C359 395 401 399 440 394C463 391 481 386 492 380C491 391 459 401 418 401S346 392 343 381Z" fill="#8fa78f" />
      <path d="M370 377C385 368 430 367 455 374M379 383C392 390 429 391 450 384M399 378C408 375 423 375 433 378" fill="none" stroke="#edf0e4" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <g data-part="massage-stones">
      <path d="M521 431C534 419 562 416 592 421C619 425 638 435 637 447C636 460 608 468 575 467C543 466 518 456 516 445C515 440 517 435 521 431Z" fill="#606960" />
      <path d="M531 429C550 420 588 422 608 429C579 425 552 428 531 435Z" fill="#899082" />
      <path d="M534 399C545 387 569 384 591 389C613 394 624 404 621 415C618 427 596 434 568 431C544 428 527 420 528 409C528 406 530 402 534 399Z" fill="#8d9586" />
      <path d="M541 398C553 390 573 390 591 394C572 393 555 397 543 402Z" fill="#b1b7a6" />
      <path d="M552 369C561 360 578 359 593 364C607 369 614 378 610 386C606 396 589 400 573 397C556 394 544 387 546 379C547 375 549 372 552 369Z" fill="#c0c4b2" />
      <path d="M556 369C565 364 577 364 587 367C574 366 565 369 558 374Z" fill="#e0e3d5" />
    </g>

    <g data-part="flower" transform="translate(172 356) rotate(-12)">
      <path d="M3 13C17 13 32 20 42 29" fill="none" stroke="#6f8568" stroke-width="2" stroke-linecap="round" />
      <path d="M24 22C31 9 43 7 55 12C47 23 36 27 24 22Z" fill="#8da285" />
      <path d="M0 0C-13-12-14-32-1-38C13-40 20-16 0 0Z" fill="#f7f2e8" stroke="#ddd4c3" stroke-width="1" />
      <path d="M0 0C4-18 21-31 32-22C40-11 20 3 0 0Z" fill="#f7f2e8" stroke="#ddd4c3" stroke-width="1" />
      <path d="M0 0C18-3 35 9 30 23C21 35 4 20 0 0Z" fill="#f7f2e8" stroke="#ddd4c3" stroke-width="1" />
      <path d="M0 0C11 15 10 34-4 36C-20 35-18 14 0 0Z" fill="#f7f2e8" stroke="#ddd4c3" stroke-width="1" />
      <path d="M0 0C-7 17-27 25-34 13C-40-1-18-12 0 0Z" fill="#f7f2e8" stroke="#ddd4c3" stroke-width="1" />
      <path d="M-6-2C-5-9 5-9 9-2C11 5 5 10-1 8C-7 7-9 2-6-2Z" fill="#bd9565" />
      <path d="M-2-2L2 2M4-3L5 1M-3 3L0 5" stroke="#e1c898" stroke-width="1.5" stroke-linecap="round" />
    </g>
  </svg>
</template>

<style scoped>
.story-nature {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.story-nature__branch {
  transform-origin: 486px 397px;
}

.story-nature--animated .story-nature__branch {
  animation: nature-branch-sway 8s ease-in-out infinite;
}

@keyframes nature-branch-sway {
  50% { transform: rotate(1deg); }
}

@media (prefers-reduced-motion: reduce) {
  .story-nature__branch { animation: none !important; }
}
</style>
