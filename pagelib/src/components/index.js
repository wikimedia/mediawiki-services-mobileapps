import Vue from 'vue';
import vueCustomElement from 'vue-custom-element';
import WmuiAccordion from './wmui-accordion.vue';

Vue.use(vueCustomElement);

Vue.customElement('wmui-accordion', WmuiAccordion);
