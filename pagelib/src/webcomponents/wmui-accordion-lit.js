import { LitElement, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

export default class WmuiAccordionLit extends LitElement {
  static get properties() {
    return {
        header: { type: String },
        headerId: { type: String },
        sectionId: { type: String },
        linkTitle: { type: String },
        __isOpen: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.__isOpen = false;
  }

  formattedHeaderId() {
      return this.headerId || this.header.split(' ').join('_');
  }

  headerLinkHref() {
      return `/w/index.pho?title=${this.linkTitle}&action=edit&section=${this.sectionId}`;
  }

  expanderId() {
      return `pcs-section-control-${this.sectionId}`;
  }

  contentId() {
      return `pcs-section-content-${this.sectionId}`;
  }

  toggle() {
      this.__isOpen = !this.__isOpen;
  }

  render() {
    return html`
        <div class="pcs-edit-section-header v2 pcs-section-hideable-header" @click=${this.toggle}>
            <span id=${this.expanderId} class=${classMap({
                'pcs-section-control': true,
                'pcs-section-control-show': !this.__isOpen,
                'pcs-section-control-hide': this.__isOpen
            })} role="button" aria-labelledby="pcs-section-aria-expand"></span>
            <h2 id=${this.formattedHeaderId()}>${this.header}</h2>
            <span class="pcs-edit-section-link-container">
                <a href=${this.headerLinkHref()} data-id=${this.sectionId} data-action="edit_section" aria-labelledby="pcs-edit-section-aria-normal" class="pcs-edit-section-link"></a>
            </span>
        </div>
        ${this.__isOpen ? html`
        <div id=${this.contentId()}>
            <slot></slot>
        </div>
        ` : html``}
    `;
  }
}
