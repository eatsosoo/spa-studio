<template>
  <div class="auth-character-stage">
    <SpaRelaxationIllustration class="auth-illustration" :size="520" primary-color="#46533f" />
    <div class="auth-character-copy"><p>Một khoảng riêng</p><span>Lịch hẹn, điểm thành viên và những điều MIÊN ghi nhớ cho bạn.</span></div>
  </div>
</template>

<style scoped>
.auth-character-stage { display: flex; min-height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 24px; overflow: hidden; background: #46533f; padding: 100px 24px 48px; }
.auth-character-copy { align-self: flex-start; margin-left: clamp(0px, 3vw, 48px); max-width: 340px; color: #f1ede1; }
.auth-character-copy p { margin: 0; font-family: 'Newsreader', serif; font-size: clamp(2rem, 3.8vw, 3.4rem); font-weight: 300; line-height: 1.05; letter-spacing: -.04em; }
.auth-character-copy span { display: block; margin-top: 14px; max-width: 34ch; color: #c8cebd; font-size: .76rem; line-height: 1.7; }
@media (max-width: 767px) {
  .auth-character-stage { min-height: 330px; gap: 6px; padding: 48px 20px 22px; }
  .auth-illustration { width: min(72%, 285px) !important; }
  .auth-character-copy { align-self: center; margin-left: 0; }
  .auth-character-copy p { font-size: 2rem; }
  .auth-character-copy span { display: none; }
}
</style>
