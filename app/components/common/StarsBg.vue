<script setup lang="ts">
// Source:
// https://github.com/nuxt-ui-templates/saas/blob/main/app/components/StarsBg.vue
// Copied from the Nuxt UI `ui/saas` template.
interface Star {
  x: number
  y: number
  size: number
}

const props = withDefaults(
  defineProps<{
    starCount?: number
    color?: string
    speed?: 'slow' | 'normal' | 'fast'
    size?: { min: number; max: number }
    direction?: 'up' | 'down'
  }>(),
  {
    starCount: 2800,
    color: 'var(--ui-primary)',
    speed: 'slow',
    direction: 'up',
    size: () => ({
      min: 2,
      max: 4
    })
  }
)

const generateStars = (count: number): Star[] => {
  const yStart = props.direction === 'down' ? -3000 : 0

  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: yStart + Math.floor(Math.random() * 3000),
    size: Math.random() * (props.size.max - props.size.min) + props.size.min
  }))
}

const speedMap = {
  slow: { duration: 200, opacity: 0.5, ratio: 0.3 },
  normal: { duration: 150, opacity: 0.75, ratio: 0.3 },
  fast: { duration: 100, opacity: 1, ratio: 0.4 }
}

const starsStateKey = `stars-bg:${props.starCount}:${props.size.min}:${props.size.max}`

const stars = useState<{ slow: Star[]; normal: Star[]; fast: Star[] }>(starsStateKey, () => {
  return {
    slow: generateStars(Math.floor(props.starCount * speedMap.slow.ratio)),
    normal: generateStars(Math.floor(props.starCount * speedMap.normal.ratio)),
    fast: generateStars(Math.floor(props.starCount * speedMap.fast.ratio))
  }
})

const starLayers = computed(() => [
  { stars: stars.value.fast, ...speedMap.fast },
  { stars: stars.value.normal, ...speedMap.normal },
  { stars: stars.value.slow, ...speedMap.slow }
])
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
    <svg
      class="pointer-events-none absolute inset-x-5 inset-y-0 sm:inset-x-7 lg:inset-x-9"
      viewBox="0 0 1017 181"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5">
        <mask id="path-1-inside-1_846_160841" fill="white">
          <path d="M0 0H1017V181H0V0Z" />
        </mask>
        <path d="M0 0H1017V181H0V0Z" fill="url(#paint0_radial_846_160841)" fill-opacity="0.22" />
      </g>
      <defs>
        <radialGradient
          id="paint0_radial_846_160841"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(508.999 19.5) rotate(90.177) scale(161.501 509.002)"
        >
          <stop offset="0" stop-color="var(--ui-primary)" />
          <stop offset="1" stop-color="var(--ui-primary)" stop-opacity="0" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_846_160841"
          x1="10.9784"
          y1="91"
          x2="1017"
          y2="90.502"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="var(--ui-primary)" stop-opacity="0" />
          <stop offset="0.395" stop-color="var(--ui-primary)" />
          <stop offset="1" stop-color="var(--ui-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>

    <div :class="['stars absolute inset-x-0 top-0 size-full', direction === 'down' ? 'stars--down' : '']">
      <div
        v-for="(layer, index) in starLayers"
        :key="index"
        :class="['star-layer', direction === 'down' ? 'star-layer--down' : '']"
        :style="{
          '--star-duration': `${layer.duration}s`,
          '--star-opacity': layer.opacity,
          '--star-color': color
        }"
      >
        <div
          v-for="(star, starIndex) in layer.stars"
          :key="starIndex"
          class="star absolute rounded-full"
          :style="{
            left: `${star.x}%`,
            top: `${star.y}px`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: 'var(--star-color)',
            opacity: 'var(--star-opacity)'
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stars {
  -webkit-mask-image: linear-gradient(
    180deg,
    rgba(217, 217, 217, 0) 0%,
    rgba(217, 217, 217, 0.8) 25%,
    #d9d9d9 50%,
    rgba(217, 217, 217, 0.8) 75%,
    rgba(217, 217, 217, 0) 100%
  );
  mask-image: linear-gradient(
    180deg,
    rgba(217, 217, 217, 0) 0%,
    rgba(217, 217, 217, 0.8) 25%,
    #d9d9d9 50%,
    rgba(217, 217, 217, 0.8) 75%,
    rgba(217, 217, 217, 0) 100%
  );
  -webkit-mask-size: cover;
  mask-size: cover;
}

.stars--down {
  -webkit-mask-image: linear-gradient(
    180deg,
    #d9d9d9 0%,
    rgba(217, 217, 217, 0.88) 28%,
    rgba(217, 217, 217, 0.45) 58%,
    rgba(217, 217, 217, 0) 100%
  );
  mask-image: linear-gradient(
    180deg,
    #d9d9d9 0%,
    rgba(217, 217, 217, 0.88) 28%,
    rgba(217, 217, 217, 0.45) 58%,
    rgba(217, 217, 217, 0) 100%
  );
}

.star-layer {
  --star-duration: 200s;
  animation: risingStarsAnimation linear infinite;
  animation-duration: var(--star-duration);
  will-change: transform;
}

.star-layer--down {
  animation-name: fallingStarsAnimation;
}

@keyframes risingStarsAnimation {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-2000px);
  }
}

@keyframes fallingStarsAnimation {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(2000px);
  }
}
</style>
