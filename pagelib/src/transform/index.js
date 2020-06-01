/* eslint-disable sort-imports */

// We want the theme transform to be first. This is because the theme transform CSS has to use
// some '!important' CSS modifiers to reliably set themes on elements which may contain inline
// styles. Moving it to the top of the file is necessary so other transforms can override
// these '!important' themes transform CSS bits if needed. Note - if other transforms have trouble
// overriding things changed by theme transform remember to match or exceed the selector specificity
// used by the theme transform for whatever it is you are trying to override.
import ThemeTransform from './ThemeTransform'

import AdjustTextSize from './AdjustTextSize'
import BodySpacingTransform from './BodySpacingTransform'
import CollapseTable from './CollapseTable'
import CollectionUtilities from './CollectionUtilities'
import CompatibilityTransform from './CompatibilityTransform'
import DimImagesTransform from './DimImagesTransform'
import EditTransform from './EditTransform'
import ElementGeometry from './ElementGeometry'
import ElementUtilities from './ElementUtilities'
import LeadIntroductionTransform from './LeadIntroductionTransform'
import FooterContainer from './FooterContainer'
import FooterLegal from './FooterLegal'
import FooterMenu from './FooterMenu'
import FooterReadMore from './FooterReadMore'
import LazyLoadTransform from './LazyLoadTransform'
import LazyLoadTransformer from './LazyLoadTransformer'
import PlatformTransform from './PlatformTransform'
import Polyfill from './Polyfill'
import RedLinks from './RedLinks'
import ReferenceCollection from './ReferenceCollection'
import Throttle from './Throttle'
import SectionUtilities from './SectionUtilities'
import HTMLUtilities from './HTMLUtilities'
import WidenImage from './WidenImage'
import './OrderedList.less'
import './Sections.less'
import './References.less'

export default {
  AdjustTextSize,
  BodySpacingTransform,
  // todo: rename CollapseTableTransform.
  CollapseTable,
  CollectionUtilities,
  CompatibilityTransform,
  DimImagesTransform,
  EditTransform,
  HTMLUtilities,
  // todo: rename Footer.ContainerTransform, Footer.LegalTransform, Footer.MenuTransform,
  //       Footer.ReadMoreTransform.
  LeadIntroductionTransform,
  FooterContainer,
  FooterLegal,
  FooterMenu,
  FooterReadMore,
  LazyLoadTransform,
  LazyLoadTransformer,
  PlatformTransform,
  // todo: rename RedLinkTransform.
  RedLinks,
  ReferenceCollection,
  SectionUtilities,
  ThemeTransform,
  // todo: rename WidenImageTransform.
  WidenImage,
  test: {
    ElementGeometry,
    ElementUtilities,
    Polyfill,
    Throttle
  }
}
