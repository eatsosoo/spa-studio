<script setup lang="ts">
import { scorePostSeo, type SeoInput } from "~/utils/postSeo";

const props = defineProps<{
  modelValue: SeoInput;
  secondaryKeywords: string;
}>();
const emit = defineEmits<{
  "update:focusKeyword": [value: string];
  "update:secondaryKeywords": [value: string];
  focus: [field: string];
}>();
const expanded = ref<string | null>(null);
const debounced = ref<SeoInput>({ ...props.modelValue });
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.modelValue,
  (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      debounced.value = { ...value };
    }, 260);
  },
  { deep: true },
);
const result = computed(() => scorePostSeo(debounced.value));
const ringStyle = computed(() => ({
  background: `conic-gradient(#5f7357 ${result.value.score * 3.6}deg, #ddd8cd 0deg)`,
}));
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <section
    class="border-t border-[#78816f]/25 pt-5"
    aria-labelledby="seo-panel-title"
  >
    <div class="flex items-center justify-between gap-4">
      <div>
        <p
          class="text-[0.6rem] font-semibold uppercase tracking-[0.17em] text-[#75806f]"
        >
          Hướng dẫn nội bộ
        </p>
        <h2
          id="seo-panel-title"
          class="mt-1 text-sm font-semibold text-[#394433]"
        >
          Chấm điểm SEO
        </h2>
      </div>
      <div
        class="grid size-14 place-items-center rounded-full p-[4px]"
        :style="ringStyle"
      >
        <div
          class="grid size-full place-items-center rounded-full bg-[#f5f1e7] text-sm font-semibold text-[#374332]"
        >
          {{ result.score }}
        </div>
      </div>
    </div>
    <p class="mt-2 text-[0.68rem] text-[#727a6f]">
      <strong class="text-[#4d5a47]">{{ result.label }}</strong> · Điểm chỉ hỗ
      trợ biên tập, không cam kết thứ hạng.
    </p>
    <div class="mt-4 grid gap-3">
      <label class="admin-field" data-seo-field="focusKeyword"
        ><span>Từ khóa chính</span
        ><input
          :value="modelValue.focusKeyword"
          placeholder="Ví dụ: chăm sóc da nhạy cảm"
          @input="
            emit(
              'update:focusKeyword',
              ($event.target as HTMLInputElement).value,
            )
          "
      /></label>
      <label class="admin-field"
        ><span
          >Từ khóa phụ
          <small class="font-normal text-[#858a81]"
            >phân cách bằng dấu phẩy</small
          ></span
        ><input
          :value="secondaryKeywords"
          placeholder="phục hồi da, spa cho da nhạy cảm"
          @input="
            emit(
              'update:secondaryKeywords',
              ($event.target as HTMLInputElement).value,
            )
          "
      /></label>
    </div>
    <div
      class="mt-5 max-h-[460px] overflow-y-auto border-y border-[#78816f]/20"
    >
      <button
        v-for="item in result.checks"
        :key="item.id"
        type="button"
        class="w-full border-b border-[#78816f]/14 py-3 text-left last:border-0"
        @click="
          expanded = expanded === item.id ? null : item.id;
          emit('focus', item.field);
        "
      >
        <span class="flex items-start gap-2.5"
          ><span
            class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full"
            :class="
              item.passed
                ? 'bg-[#dce7d7] text-[#4f6848]'
                : 'bg-[#efe0dc] text-[#8b554c]'
            "
          >
            <AppIcon :name="item.passed ? 'check' : 'close'" :size="10" /></span
          ><span class="min-w-0 flex-1 mr-2"
            ><span class="flex justify-between gap-3"
              ><strong class="text-[0.7rem] font-semibold text-[#444f3f]">{{
                item.label
              }}</strong
              ><small class="shrink-0 text-[0.62rem] text-[#7d8478]"
                >{{ item.points }}/{{ item.maxPoints }}</small
              ></span
            ><span
              v-if="expanded === item.id"
              class="mt-2 block text-[0.65rem] leading-5 text-[#777e72]"
              >{{ item.explanation }}
              <b class="font-semibold text-[#556050]">{{
                item.guidance
              }}</b></span
            ></span
          ></span
        >
      </button>
    </div>
  </section>
</template>
