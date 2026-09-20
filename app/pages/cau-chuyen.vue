<script setup lang="ts">
useStoreSeo(
  'Câu chuyện MIÊN | Một hành trình trở về cân bằng',
  'Khám phá câu chuyện MIÊN Spa qua hành trình lắng nghe, chạm vào thiên nhiên và tìm lại nhịp cân bằng của cơ thể.',
  '/cau-chuyen',
)

const storyRoot = ref<HTMLElement | null>(null)
const activeChapter = ref(0)
const storyProgress = ref(0)
const spaProgress = ref(0)
const { openBooking } = useBookingDrawer()
let cleanupStory: (() => void) | undefined

const chapters = [
  { label: 'Mở đầu', id: 'mo-dau' },
  { label: 'Lắng nghe', id: 'lang-nghe' },
  { label: 'Thiên nhiên', id: 'thien-nhien' },
  { label: 'Thư giãn', id: 'thu-gian' },
  { label: 'Thay đổi', id: 'thay-doi' },
  { label: 'Lời mời', id: 'loi-moi' },
]

onMounted(() => {
  const root = storyRoot.value
  if (!root) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const revealElements = Array.from(root.querySelectorAll<HTMLElement>('.story-observe'))
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-story-section]'))
  const spaSection = root.querySelector<HTMLElement>('.story-spa')
  const observers: IntersectionObserver[] = []

  if (reducedMotion) revealElements.forEach(element => element.classList.add('is-visible'))
  else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver.unobserve(entry.target)
        }
      })
    }, { rootMargin: '0px 0px -16% 0px', threshold: 0.16 })
    revealElements.forEach(element => revealObserver.observe(element))
    observers.push(revealObserver)
  }

  const chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (visible) activeChapter.value = Number((visible.target as HTMLElement).dataset.storySection ?? 0)
  }, { rootMargin: '-34% 0px -34% 0px', threshold: [0, 0.2, 0.5, 0.8] })
  sections.forEach(section => chapterObserver.observe(section))
  observers.push(chapterObserver)

  let frame = 0
  const updateProgress = () => {
    frame = 0
    const rootRect = root.getBoundingClientRect()
    const range = Math.max(1, root.offsetHeight - window.innerHeight)
    storyProgress.value = Math.min(1, Math.max(0, -rootRect.top / range))
    root.style.setProperty('--story-progress', String(storyProgress.value))
    if (spaSection && !reducedMotion) {
      const rect = spaSection.getBoundingClientRect()
      const spaRange = Math.max(1, rect.height - window.innerHeight)
      spaProgress.value = Math.min(1, Math.max(0, -rect.top / spaRange))
    } else spaProgress.value = 1
  }
  const requestUpdate = () => { if (!frame) frame = window.requestAnimationFrame(updateProgress) }
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
  updateProgress()

  cleanupStory = () => {
    observers.forEach(observer => observer.disconnect())
    window.removeEventListener('scroll', requestUpdate)
    window.removeEventListener('resize', requestUpdate)
    if (frame) window.cancelAnimationFrame(frame)
  }
})

onBeforeUnmount(() => cleanupStory?.())
</script>

<template>
  <div ref="storyRoot" class="story-page min-h-[100dvh] overflow-x-clip text-[#293126]">
    <StoryBackground :active-chapter="activeChapter" :progress="storyProgress" />
    <div class="relative z-[1]"><SiteHeader /></div>

    <nav class="story-progress" aria-label="Tiến trình câu chuyện">
      <a v-for="(chapter, index) in chapters" :key="chapter.id" :href="`#${chapter.id}`" :class="{ 'is-active': activeChapter === index }"><span>{{ String(index + 1).padStart(2, '0') }}</span><span class="story-progress__label">{{ chapter.label }}</span></a>
    </nav>

    <main class="relative z-[1]">
      <section id="mo-dau" class="story-hero relative flex min-h-[100dvh] items-center px-5 pb-14 pt-28 md:px-10 lg:px-14" data-story-section="0">
        <div class="mx-auto grid w-full max-w-[1400px] items-center gap-8 lg:grid-cols-[.82fr_1.18fr] lg:gap-[6vw]">
          <div class="story-hero__copy max-w-[660px] lg:pl-[4vw]">
            <p class="section-label">Câu chuyện MIÊN</p>
            <h1 class="mt-7 font-display text-[clamp(3.7rem,6.7vw,7.6rem)] font-light leading-[.9] tracking-[-0.055em]">Một hành trình<br><span class="ml-[9vw] italic text-[#637162]">trở về mình.</span></h1>
            <p class="mt-9 max-w-[47ch] text-[0.98rem] leading-8 text-[#59635a] lg:ml-[9vw]">MIÊN bắt đầu từ một mong muốn giản dị: tạo ra khoảng lặng để mỗi người tìm lại sự cân bằng, bình yên và vẻ đẹp tự nhiên vốn có.</p>
          </div>
          <div class="story-hero__art"><StoryIllustration variant="arrival" /></div>
        </div>
        <a href="#lang-nghe" class="story-scroll-cue" aria-label="Cuộn đến chương tiếp theo"><span>Cuộn để bắt đầu</span><i aria-hidden="true" /></a>
      </section>

      <StoryChapter id="lang-nghe" chapter="2" title="Bắt đầu từ sự lắng nghe." description="Trước mỗi liệu trình là một cuộc trò chuyện đủ chậm. Chúng tôi lắng nghe điều cơ thể đang kể, nhịp sống bạn vừa đi qua và cảm giác bạn muốn mang theo khi rời MIÊN." illustration="listening">
        <p class="mt-8 border-l border-[#72806d]/40 pl-5 font-display text-2xl font-light italic text-[#52614b]">Không có hai cơ thể nào cần cùng một nhịp chăm sóc.</p>
      </StoryChapter>

      <StoryChapter id="thien-nhien" chapter="3" title="Chạm vào thiên nhiên." description="Từ thảo mộc, tinh dầu đến những viên đá ấm, mỗi chất liệu đều được chọn vì sự an toàn và khả năng nâng đỡ cơ thể — không phô trương, không dư thừa." illustration="nature" reverse>
        <ul class="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold uppercase tracking-[0.13em] text-[#657267]" aria-label="Nguyên liệu chăm sóc"><li>Lá và hoa</li><li>Tinh dầu</li><li>Đá ấm</li><li>Nước</li></ul>
      </StoryChapter>

      <div id="thu-gian"><StorySpaScene :progress="spaProgress" /></div>

      <StoryChapter id="thay-doi" chapter="5" title="Sự thay đổi đến từ bên trong." description="Khi cơ thể được nghỉ đủ sâu, đôi vai nhẹ hơn, làn da sáng hơn và hơi thở cũng rộng hơn. Sự tự tin không được thêm vào — nó hiện ra khi những mỏi mệt được đặt xuống." illustration="renewal">
        <div class="mt-9 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-[#72806d]/30 pt-7 text-sm text-[#526058]"><p>Nhẹ nhàng hơn</p><p>Cân bằng hơn</p><p>Tươi sáng hơn</p><p>Gần với mình hơn</p></div>
      </StoryChapter>

      <section id="loi-moi" class="story-observe relative flex min-h-[95svh] items-center px-5 py-24 md:px-10 lg:px-14" data-story-section="5">
        <div class="story-finale mx-auto grid w-full max-w-[1400px] overflow-hidden rounded-[.5rem] bg-[#43513e] px-6 py-14 text-[#f6f0e4] md:px-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-20 lg:py-20">
          <div class="story-finale__copy relative z-[1]">
            <p class="text-[.68rem] font-semibold uppercase tracking-[.23em] text-[#c7d0c1]">Chương 06 · Lời mời</p>
            <h2 class="mt-7 max-w-[760px] font-display text-[clamp(3.1rem,5.8vw,6.8rem)] font-light leading-[.96] tracking-[-.05em]">Dành một khoảng<br><span class="italic text-[#d9c6a5]">cho chính mình.</span></h2>
            <p class="mt-8 max-w-[45ch] text-sm leading-7 text-[#d8ddd4]">Bạn không cần đợi đến khi quá mệt mới cho mình được nghỉ. MIÊN ở đây để cùng bạn chọn một nghi thức vừa đủ.</p>
            <div class="mt-9 flex flex-wrap gap-4"><AppButton to="/lieu-trinh" variant="secondary" label="Khám phá liệu trình" icon="arrow" /><AppButton label="Đặt lịch ngay" icon="calendar" @click="openBooking()" /></div>
          </div>
          <div class="story-finale__art"><StoryIllustration variant="finale" /></div>
        </div>
      </section>
    </main>
    <div class="relative z-[1]"><SiteFooter /></div>
  </div>
</template>

<style scoped>
.story-hero__copy { animation: story-hero-copy 1.1s cubic-bezier(.16,1,.3,1) both }.story-hero__art { animation: story-hero-art 1.35s .12s cubic-bezier(.16,1,.3,1) both }
.story-scroll-cue { position:absolute;bottom:2rem;left:50%;display:grid;justify-items:center;gap:.75rem;transform:translateX(-50%);font-size:.62rem;font-weight:600;letter-spacing:.17em;text-transform:uppercase;color:#657066 }.story-scroll-cue i{display:block;width:1px;height:2.8rem;background:#66715d;transform-origin:top;animation:story-cue 2s ease-in-out infinite}
.story-progress { position:fixed;right:1.5rem;top:50%;z-index:10;display:grid;gap:.55rem;transform:translateY(-50%) }.story-progress a{display:flex;align-items:center;justify-content:flex-end;gap:.7rem;font-size:.58rem;font-weight:600;letter-spacing:.1em;color:#7d877b;transition:color .3s ease}.story-progress a::after{width:1.25rem;height:1px;content:"";background:currentColor;transition:width .4s cubic-bezier(.16,1,.3,1)}.story-progress a.is-active{color:#34412f}.story-progress a.is-active::after{width:2.8rem}.story-progress__label{position:absolute;right:5rem;opacity:0;white-space:nowrap;transition:opacity .25s ease}.story-progress a:hover .story-progress__label,.story-progress a:focus-visible .story-progress__label{opacity:1}
.story-finale__copy,.story-finale__art{opacity:0;transform:translateY(28px);transition:opacity 1s ease,transform 1.1s cubic-bezier(.16,1,.3,1)}.is-visible .story-finale__copy,.is-visible .story-finale__art{opacity:1;transform:none}.story-finale__art{margin-bottom:-5rem;transform:translate(30px,40px);filter:saturate(.8)}.story-finale :deep(.app-action--secondary){border-color:rgba(247,242,232,.45);color:#f7f2e8}.story-finale :deep(.app-action--secondary:hover){background:#f1e9dc;color:#34412f}
@keyframes story-hero-copy{from{opacity:0;transform:translateY(30px)}}@keyframes story-hero-art{from{opacity:0;transform:translateX(55px) scale(.97)}}@keyframes story-cue{0%,100%{transform:scaleY(.3);opacity:.35}50%{transform:scaleY(1);opacity:1}}
@media(max-width:1023px){.story-progress{display:none}.story-scroll-cue{display:none}.story-finale__art{margin-top:1rem;margin-bottom:-3rem}.story-hero__art{margin-top:-2rem}}
@media(max-width:767px){.story-finale{border-radius:0}.story-finale__art{margin-inline:-2rem}.story-hero h1 span{margin-left:0}.story-hero__copy p:last-child{margin-left:0}}
@media(prefers-reduced-motion:reduce){.story-hero__copy,.story-hero__art,.story-scroll-cue i,.story-finale__copy,.story-finale__art{animation:none;opacity:1;transform:none;transition:none}}
</style>
