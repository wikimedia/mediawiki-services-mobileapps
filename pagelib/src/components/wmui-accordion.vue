<template>
    <div>
        <div class="pcs-edit-section-header v2 pcs-section-hideable-header" @click="toggle()">
            <span :id="expanderId" class="pcs-section-control" :class="{ 'pcs-section-control-show': !isOpen, 'pcs-section-control-hide': isOpen}" role="button" aria-labelledby="pcs-section-aria-expand"></span>
            <h2 :id="header_id" class="pcs-edit-section-title">{{ header }}</h2>
            <span class="pcs-edit-section-link-container">
                <a :href="headerLinkHref" :data-id="sectionId" data-action="edit_section" aria-labelledby="pcs-edit-section-aria-normal" class="pcs-edit-section-link"></a>
            </span>
        </div>
        <div :id="contentId" v-if="isOpen">
            <slot></slot>
        </div>
    </div>
</template>
<script>
export default {
    props: {
        header: {
            type: String,
            required: true
        },
        headerId: String,
        sectionId: {
            type: String,
            required: true
        },
        linkTitle: {
            type: String,
            required: true
        }
    },
    data: function () {
        return {
            isOpen: false
        };
    },
    computed: {
        header_id() {
            return this.headerId || this.header.split(' ').join('_');
        },
        headerLinkHref() {
            return `/w/index.php?title=${this.linkTitle}&action=edit&section=${this.sectionId}`;
        },
        expanderId() {
            return `pcs-section-control-${this.sectionId}`;
        },
        contentId() {
            return `pcs-section-content-${this.sectionId}`;
        }
    },
    methods: {
        toggle() {
            this.isOpen = !this.isOpen;
        }
    },
};
</script>
<style scoped>
</style>
