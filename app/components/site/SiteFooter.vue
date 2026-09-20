<script setup lang="ts">
import { footerLinkGroups, siteInfo, socialLinks } from '~/data/site'

const { openBooking } = useBookingDrawer()
</script>

<template>
  <footer class="border-t border-[#77806d]/25 bg-[#ebe6da] px-5 pb-8 pt-14 md:px-10 md:pt-20 lg:px-14">
    <div class="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.05fr_1.4fr] lg:gap-[8vw]">
      <div>
        <NuxtLink to="/" class="font-display text-5xl font-light tracking-[-0.04em]" :aria-label="`${siteInfo.brand}, về trang chủ`">MIÊN</NuxtLink>
        <p class="mt-4 max-w-sm text-sm leading-7 text-[#62695f]">{{ siteInfo.description }}</p>
        <div class="mt-7 text-xs leading-6 text-[#596056]">
          <p>{{ siteInfo.address }}</p>
          <p>{{ siteInfo.openingHours }}</p>
          <a :href="siteInfo.phoneHref" class="mt-3 block hover:text-[#2f392a]">{{ siteInfo.phone }}</a>
          <a :href="siteInfo.emailHref" class="block hover:text-[#2f392a]">{{ siteInfo.email }}</a>
        </div>
      </div>

      <nav class="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3" aria-label="Thông tin cuối trang">
        <section v-for="group in footerLinkGroups" :key="group.title">
          <h2 class="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#727a6d]">{{ group.title }}</h2>
          <ul class="mt-5 space-y-3 text-sm">
            <li v-for="link in group.links" :key="link.to ?? link.action">
              <button v-if="link.action === 'booking'" type="button" class="text-left transition hover:text-[#75816c]" @click="openBooking()">{{ link.label }}</button>
              <NuxtLink v-else-if="link.to" :to="link.to" class="transition hover:text-[#75816c]">{{ link.label }}</NuxtLink>
            </li>
          </ul>
        </section>
      </nav>
    </div>

    <div class="mx-auto mt-14 flex max-w-[1400px] flex-col gap-5 border-t border-[#77806d]/25 pt-7 text-[0.68rem] text-[#687064] sm:flex-row sm:items-center sm:justify-between">
      <p>{{ siteInfo.copyright }}</p>
      <nav class="flex flex-wrap gap-5" aria-label="Mạng xã hội">
        <a v-for="link in socialLinks" :key="link.to" :href="link.to" target="_blank" rel="noreferrer" class="transition hover:text-[#293126]">{{ link.label }}</a>
      </nav>
    </div>
  </footer>
</template>
