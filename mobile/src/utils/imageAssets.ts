// Centralized Image Assets for SafeTrip
// Including Vijayawada Destination, Car, Metro, Bike, and Walking

export const IMAGES = {
  // SafeTrip Brand Logos
  logoSafeTrip: require('../../assets/logo_safetrip.png'),
  logoSafeTripTransparent: require('../../assets/logo_safetrip_transparent.png'),
  logoShield: require('../../assets/logo_shield.png'),
  logoShieldTransparent: require('../../assets/logo_shield_transparent.png'),

  // Landmarks & Places
  vijayawada: require('../../assets/vijayawada.png'),
  college: require('../../assets/dest_college.jpg'),
  gym: require('../../assets/dest_gym.jpg'),
  mall: require('../../assets/dest_mall.jpg'),

  // Family & Landscape Artwork
  family: require('../../assets/family_sunset.jpg'),
  landscape: require('../../assets/green_landscape.jpg'),

  // Transport Modes
  car: require('../../assets/mode_car.png'),
  metro: require('../../assets/mode_metro.png'),
  bike: require('../../assets/mode_bike.png'),
  walking: require('../../assets/mode_walking.png'),
};

// Web / HTML URLs for Leaflet Map markers and iframes
export const WEB_IMAGE_URLS = {
  vijayawada: '/assets/vijayawada.png',
  college: '/assets/dest_college.jpg',
  gym: '/assets/dest_gym.jpg',
  mall: '/assets/dest_mall.jpg',
  family: '/assets/family_sunset.jpg',
  landscape: '/assets/green_landscape.jpg',
  car: '/assets/mode_car.png',
  metro: '/assets/mode_metro.png',
  bike: '/assets/mode_bike.png',
  walking: '/assets/mode_walking.png',
};

export const getDestinationPhoto = (nameOrCategory: string) => {
  const lower = (nameOrCategory || '').toLowerCase();
  if (lower.includes('srm') || lower.includes('college') || lower.includes('univ') || lower.includes('school') || lower.includes('campus')) {
    return IMAGES.college;
  }
  if (lower.includes('gym') || lower.includes('fit') || lower.includes('workout')) {
    return IMAGES.gym;
  }
  if (lower.includes('mall') || lower.includes('pvp') || lower.includes('shop') || lower.includes('market') || lower.includes('square')) {
    return IMAGES.mall;
  }
  return IMAGES.vijayawada;
};

