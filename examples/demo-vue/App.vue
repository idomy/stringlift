<script setup>
import { ref } from "vue";
const count = ref(0);
</script>

<template>
  <div class="flex flex-col gap-4 rounded-xl border p-4">
    <h1>Welcome to the Vue demo</h1>
    <p>
      This app was never internationalized
    </p>
    <input type="text" placeholder="Search items" title="Search box" :placeholder="dynamic" />
    <img alt="Company logo" src="/assets/logo.svg" />
    <button v-if="count > 0" :class="count > 1 ? 'big' : 'small'" aria-label="Increment counter">
      You clicked {{ count }} times
    </button>
    <span style="color: red">Plain styled text</span>
    <a href="/settings/account" class="link">Open settings</a>
  </div>
</template>
