import type { Product } from './data'
import type { Locale } from './i18n'

type LocalizedProductFields = Pick<
  Product,
  'category' | 'caption' | 'eta' | 'tags' | 'options' | 'overview' | 'detailPoints' | 'specs' | 'notices'
>

const englishProductCopy: Partial<Record<string, LocalizedProductFields>> = {
  'orb-case': {
    category: 'Tech',
    caption: 'A glossy tech accessory with a silver frame and a rippled reflective pattern.',
    eta: '5-8 days',
    tags: ['iPhone', 'Gift pick', 'Trend'],
    options: ['iPhone 15 Pro / Silver', 'iPhone 16 / Clear Pink', 'Galaxy S25 / Mirror'],
    overview:
      'A hard-shell case with a subtle wave texture that catches light without looking overdesigned. It is a strong daily option for customers who want a cleaner tech mood.',
    detailPoints: [
      'The back panel has a fine ripple texture that becomes more visible depending on the angle of the light.',
      'A hidden MagSafe ring keeps wireless charging and wallet attachment easy to use.',
      'The silver edge coating gives it enough visual presence to work like a small object in photos.',
    ],
    specs: [
      { label: 'Material', value: 'PC + TPU blend' },
      { label: 'Finish', value: 'Gloss coating' },
      { label: 'Packaging', value: 'Individual paper sleeve included' },
      { label: 'Origin', value: 'Korea' },
    ],
    notices: [
      'Because of the gloss finish, minor surface scratches can appear and an inspection request is recommended.',
      'Camera cutouts vary by device, so confirm the model option before ordering.',
    ],
  },
  'cloud-bag': {
    category: 'Fashion',
    caption: 'A roomy nylon shoulder bag with soft volume and an easy daily silhouette.',
    eta: '6-9 days',
    tags: ['Shoulder bag', 'Campus look', 'Daily'],
    options: ['Sky Blue / Free', 'Ivory / Free', 'Graphite / Free'],
    overview:
      'This shoulder bag holds a lot without looking oversized when worn. The padded volume pairs especially well with light jackets and knitwear through spring and fall.',
    detailPoints: [
      'Two outer pockets and divided inner storage make it easy to separate a tablet from everyday essentials.',
      'The lightweight nylon fabric keeps it practical for daily commuting or school use.',
      'A reinforced bottom panel helps the shape stay structured instead of collapsing.',
    ],
    specs: [
      { label: 'Size', value: 'W 42 x H 31 x D 14 cm' },
      { label: 'Weight', value: '480g' },
      { label: 'Material', value: 'Nylon 100%' },
      { label: 'Capacity', value: 'Fits a 13-inch laptop' },
    ],
    notices: [
      'Lighter colors can appear more saturated depending on lighting conditions.',
      'It may arrive folded, so a quick shape adjustment may be needed before first use.',
    ],
  },
  'dew-drop': {
    category: 'Beauty',
    caption: 'A glow ampoule set that brightens the skin tone before makeup.',
    eta: '4-7 days',
    tags: ['Vegan', 'Tone-up', 'Olive Young sale'],
    options: ['30ml single', '30ml + pad gift', '2-piece set'],
    overview:
      'The formula focuses on hydration with a soft glow finish, making it useful as a prep step before makeup. Customers who prefer lightweight texture tend to respond well to this item.',
    detailPoints: [
      'It absorbs quickly with little stickiness, so it fits well into a morning routine.',
      'The glow looks more balanced when used together with a moisturizer rather than alone.',
      'Seasonal gift sets can change, so confirm the current bundled item before ordering.',
    ],
    specs: [
      { label: 'Volume', value: '30ml' },
      { label: 'Shelf life', value: '12 months after opening' },
      { label: 'Skin type', value: 'Recommended for normal-dry and combination skin' },
      { label: 'Texture', value: 'Light serum' },
    ],
    notices: [
      'Beauty products can face quantity limits in combined international shipments depending on airline regulations.',
      'The outer package may vary slightly if the product goes through a packaging renewal.',
    ],
  },
  'nova-buds': {
    category: 'Tech',
    caption: 'Compact Bluetooth earbuds with a crystal-inspired lighting accent.',
    eta: '5-7 days',
    tags: ['Earbuds', 'Commute', 'Back to school'],
    options: ['Lavender', 'Silver Blue', 'Pearl White'],
    overview:
      'These earbuds combine a small case with a decorative LED accent for a more giftable, style-driven feel. Demand is usually stronger from customers looking for presentation and mood rather than raw performance alone.',
    detailPoints: [
      'When the lid opens, a soft light effect makes the case feel more like a display object.',
      'Touch response is quick, and core call quality is reliable for day-to-day use.',
      'Customer satisfaction is high when it is paired with other small tech accessories as a gift set.',
    ],
    specs: [
      { label: 'Battery', value: '6 hours for earbuds / 24 hours with case' },
      { label: 'Charging', value: 'USB-C' },
      { label: 'Connection', value: 'Bluetooth 5.3' },
      { label: 'In the box', value: '3 ear tip sizes, charging cable' },
    ],
    notices: [
      'Once opened, electronics may have limited return eligibility depending on the seller policy.',
      'The LED color effect can look different depending on the shooting or lighting environment.',
    ],
  },
  'satin-cap': {
    category: 'Accessories',
    caption: 'A low-profile cap with a slim brim and glossy satin-style stitching.',
    eta: '7-10 days',
    tags: ['Ball cap', 'Limited', 'Celebrity pick'],
    options: ['Black', 'Forest', 'Cream'],
    overview:
      'The brim is not overly long and the embroidery stays light, so the cap works easily for a wide range of everyday styling. It pairs especially well with casual jackets and knitwear.',
    detailPoints: [
      'The satin-style embroidery feels less heavy than louder logo caps.',
      'Its low-profile shape gives a balanced depth and often makes the face look smaller.',
      'Because it is sold on a resale platform, prices can change depending on the listing period.',
    ],
    specs: [
      { label: 'Circumference', value: 'Free / adjustable strap' },
      { label: 'Material', value: 'Cotton 100%' },
      { label: 'Fit', value: 'Low profile' },
      { label: 'Care', value: 'Hand wash recommended' },
    ],
    notices: [
      'On resale platforms, it is best to request confirmation on tag condition and included accessories.',
      'For off-white shades, a stain inspection request is recommended.',
    ],
  },
  'jam-candle': {
    category: 'Living',
    caption: 'A home-cafe style candle with butter-toned wax in a jam-jar glass container.',
    eta: '6-8 days',
    tags: ['Candle', 'Home cafe', 'Gift'],
    options: ['Butter Toast', 'White Fig', 'Milk Tea'],
    overview:
      'This candle uses a jam-jar style glass vessel and warm wax color to work as both fragrance and decor. It also performs well with customers who are primarily looking for a visual object mood.',
    detailPoints: [
      'The short glass-jar shape keeps the volume compact enough for desks, kitchens, and shelves.',
      'Even without lighting the wick, the scent tends to come through softly.',
      'For resale or secondhand items, label condition and signs of use should be checked carefully.',
    ],
    specs: [
      { label: 'Volume', value: '180g' },
      { label: 'Burn time', value: 'About 32 hours' },
      { label: 'Material', value: 'Soy wax / glass jar' },
      { label: 'Packaging', value: 'Ribbon gift box available' },
    ],
    notices: [
      'For glass-fragile items, request a packaging inspection before shipment whenever possible.',
      'For secondhand listings, confirm the level of use and remaining quantity before purchase.',
    ],
  },
}

export function getLocalizedProduct(product: Product, locale: Locale) {
  if (locale === 'ko') {
    return product
  }

  const localizedFields = englishProductCopy[product.id]

  if (!localizedFields) {
    return product
  }

  return {
    ...product,
    ...localizedFields,
  }
}
