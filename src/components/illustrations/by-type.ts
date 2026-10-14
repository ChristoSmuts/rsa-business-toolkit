/**
 * The two-tone illustration of each kind of business, shared by the type tiles
 * (`BusinessTypeTiles`) and the business-type page's facts (`TypeFacts`, from 480px), so a reader
 * sees on the page the picture of the tile they tapped.
 */
import BeautyCare from './BeautyCare.astro';
import FoodBusiness from './FoodBusiness.astro';
import ProfessionalCreative from './ProfessionalCreative.astro';
import RetailOnline from './RetailOnline.astro';
import ServicesTrades from './ServicesTrades.astro';
import VehicleDealer from './VehicleDealer.astro';

export const TYPE_ILLUSTRATIONS = {
  'vehicle-dealer': VehicleDealer,
  food: FoodBusiness,
  beauty: BeautyCare,
  'retail-online': RetailOnline,
  'services-trades': ServicesTrades,
  'professional-creative': ProfessionalCreative,
} as const;
