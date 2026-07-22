<script setup lang="ts">
import InputPane from '@/components/InputPane.vue';
import OutputPane from '@/components/OutputPane.vue';
import PosLegend from '@/components/PosLegend.vue';
</script>

<template>
  <div class="reader-view">
    <PosLegend />
    <div class="reader-panes">
      <div class="pane pane-input">
        <InputPane />
      </div>
      <div class="pane pane-output">
        <OutputPane />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reader-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-panes {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.pane-input {
  max-width: 50%;
}

.pane-output {
  overflow-y: auto;
}

/* Below 1024px: stack vertically as tabs */
@media (max-width: 1023px) {
  .reader-panes {
    flex-direction: column;
  }

  .pane-input {
    max-width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .pane-output {
    flex: 1;
  }
}
</style>
