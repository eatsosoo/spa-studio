<script setup lang="ts">
const route = useRoute()

const tabs = [
  { id: 'profile', label: 'Hồ sơ' },
  { id: 'appointments', label: 'Lịch hẹn' },
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'feedback', label: 'Đánh giá' },
]

const queryValues: Record<string, string> = {
  profile: 'ho-so',
  appointments: 'lich-hen',
  orders: 'don-hang',
  feedback: 'danh-gia',
}

const activeTab = computed(() => {
  if (route.query.tab === 'lich-hen') return 'appointments'
  if (route.query.tab === 'don-hang') return 'orders'
  if (route.query.tab === 'danh-gia') return 'feedback'
  return 'profile'
})

async function selectTab(id: string) {
  const tab = queryValues[id]
  if (!tab || id === activeTab.value) return
  const destination = { path: '/tai-khoan', query: { tab } }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const documentWithTransition = document as Document & {
    startViewTransition?: (update: () => Promise<unknown>) => { finished: Promise<void> }
  }

  if (!reducedMotion && documentWithTransition.startViewTransition) {
    await documentWithTransition.startViewTransition(() => navigateTo(destination)).finished
    return
  }

  await navigateTo(destination)
}
</script>

<template>
  <CommonTabs
    class="customer-account-tabs w-full lg:w-[35rem]"
    :model-value="activeTab"
    :items="tabs"
    aria-label="Khu vực tài khoản"
    @update:model-value="selectTab"
  />
</template>

<style scoped>
.customer-account-tabs {
  view-transition-name: customer-account-tabs;
}

@media (prefers-reduced-motion: reduce) {
  .customer-account-tabs {
    view-transition-name: none;
  }
}
</style>
