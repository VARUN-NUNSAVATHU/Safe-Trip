import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';

export interface ActiveJourneyMapProps {
  origin: {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  progressPercent: number; // 0 to 100
  transportMode?: 'Transit' | 'Car' | 'Walking' | 'Bicycle';
  remainingMinutes?: number;
  remainingDistanceKm?: number;
  routePath?: [number, number][];
  height?: number;
}

export const ActiveJourneyMap: React.FC<ActiveJourneyMapProps> = ({
  origin,
  destination,
  currentLocation,
  progressPercent,
  transportMode = 'Car',
  remainingMinutes = 11,
  remainingDistanceKm = 5.5,
  routePath,
  height = 360,
}) => {
  const [mapTheme, setMapTheme] = useState<'street' | 'night' | 'satellite'>('street');

  // Sanitize coordinates (support global locations, fallback only when missing)
  const oLat = typeof origin.latitude === 'number' && !Number.isNaN(origin.latitude) && origin.latitude !== 0 ? origin.latitude : 16.4614;
  const oLng = typeof origin.longitude === 'number' && !Number.isNaN(origin.longitude) && origin.longitude !== 0 ? origin.longitude : 80.5069;
  const oName = (origin.name || 'Home Zone (Departure)').replace(/'/g, "\\'");
  const oAddr = (origin.address || 'Departure Point').replace(/'/g, "\\'");

  const dLat = typeof destination.latitude === 'number' && !Number.isNaN(destination.latitude) && destination.latitude !== 0 ? destination.latitude : 16.5062;
  const dLng = typeof destination.longitude === 'number' && !Number.isNaN(destination.longitude) && destination.longitude !== 0 ? destination.longitude : 80.6480;
  const dName = (destination.name || 'Destination').replace(/'/g, "\\'");
  const dAddr = (destination.address || 'Destination Point').replace(/'/g, "\\'");

  // Use exact real-world road geometry when available, otherwise fallback to smooth Bezier arc
  const routePoints = useMemo(() => {
    if (routePath && routePath.length >= 2) {
      return routePath;
    }
    const points: [number, number][] = [];
    const steps = 20;
    // Calculate perpendicular offset for realistic road curvature
    const midLat = (oLat + dLat) / 2;
    const midLng = (oLng + dLng) / 2;
    const deltaLat = dLat - oLat;
    const deltaLng = dLng - oLng;
    // Arc offset
    const curveOffsetLat = -deltaLng * 0.12;
    const curveOffsetLng = deltaLat * 0.12;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Quadratic Bezier interpolation: (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
      const lat = (1 - t) * (1 - t) * oLat + 2 * (1 - t) * t * (midLat + curveOffsetLat) + t * t * dLat;
      const lng = (1 - t) * (1 - t) * oLng + 2 * (1 - t) * t * (midLng + curveOffsetLng) + t * t * dLng;
      points.push([lat, lng]);
    }
    return points;
  }, [routePath, oLat, oLng, dLat, dLng]);

  // Current vehicle location along route
  const currentVehiclePos = useMemo(() => {
    // If we have a real GPS fix (non-zero, non-Palo-Alto), use it directly
    if (
      currentLocation &&
      typeof currentLocation.latitude === 'number' &&
      typeof currentLocation.longitude === 'number' &&
      currentLocation.latitude !== 0 &&
      currentLocation.longitude !== 0 &&
      !(Math.abs(currentLocation.latitude - 37.4419) < 0.01 && Math.abs(currentLocation.longitude - (-122.143)) < 0.01)
    ) {
      return [currentLocation.latitude, currentLocation.longitude];
    }

    const clampedProgress = Math.min(Math.max(progressPercent, 0), 100);
    const index = Math.min(
      Math.floor((clampedProgress / 100) * (routePoints.length - 1)),
      routePoints.length - 1
    );
    const remainder = ((clampedProgress / 100) * (routePoints.length - 1)) - index;
    const currentPt = routePoints[index];
    const nextPt = routePoints[Math.min(index + 1, routePoints.length - 1)];

    const lat = currentPt[0] + (nextPt[0] - currentPt[0]) * remainder;
    const lng = currentPt[1] + (nextPt[1] - currentPt[1]) * remainder;

    return [lat, lng];
  }, [progressPercent, routePoints, currentLocation]);

  // Crisp vector SVG icon for vehicle marker based on transport mode
  const vehicleSvg = transportMode === 'Bicycle'
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="#10B981"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm7-6.5l-1.9-3.2c-.4-.6-1-1-1.7-1H5v2h2.6l1.5 2.5-2.7 4.5 1.7 1 3.1-5.3 2.8 2.8v4.5h2v-5.3l-3-3 1.1-2.2c1.2 1.3 3 2.2 4.9 2.2v-2c-1.6 0-3-.9-3.7-2zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>`
    : transportMode === 'Walking'
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="#369E33"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/></svg>`
    : transportMode === 'Transit'
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="#6366F1"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="#2563EB"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

  const modeLabel = transportMode === 'Bicycle'
    ? 'Bike'
    : transportMode === 'Walking'
    ? 'Walking'
    : transportMode === 'Transit'
    ? 'Metro / Bus'
    : 'Car';

  const hasValidDest = Boolean(
    destination &&
    destination.name &&
    destination.name !== 'Select Destination' &&
    destination.name !== 'Search or choose a destination' &&
    !destination.name.toLowerCase().includes('select destination')
  );

  const isVijayawadaDest = dName.toLowerCase().includes('vijayawada') ||
    dName.toLowerCase().includes('pvp') ||
    dAddr.toLowerCase().includes('vijayawada');

  const destBadgeHtml = isVijayawadaDest
    ? '<img src="/assets/vijayawada.png" class="dest-thumb-badge" alt="Vijayawada" /><span class="dot-pulse-green"></span><span>DESTINATION</span>'
    : '<span class="dot-pulse-green"></span><span>DESTINATION</span>';

  const destPopupImageHtml = isVijayawadaDest
    ? '<img src="/assets/vijayawada.png" style="width:160px; height:85px; object-fit:cover; border-radius:8px; margin:6px 0; display:block;"/><b style="font-size:12px; color:#0F172A;">Prakasam Barrage, Krishna River</b><br/>'
    : '';

  const destIconWidth = isVijayawadaDest ? 165 : 130;
  const destIconAnchorX = isVijayawadaDest ? 82 : 65;

  // Generate self-contained Leaflet HTML with Google Maps Tiles, Red Departure & Green Destination signs
  const mapHtml = useMemo(() => {
    const routePointsJson = JSON.stringify(routePoints);
    const vehiclePosJson = JSON.stringify(currentVehiclePos);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Google Map Active Journey</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script>
    if (typeof L === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(s);
    }
  </script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #e5e3df; }

    /* Google Street Tile default */
    .leaflet-tile {
      ${mapTheme === 'night' ? 'filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);' : ''}
    }

    /* Red Departure Sign */
    .sign-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      pointer-events: auto;
      cursor: pointer;
    }

    .badge-sign-red {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #DC2626;
      color: #FFFFFF;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45);
      border: 2px solid #FFFFFF;
      white-space: nowrap;
      animation: bounceSign 2s ease-in-out infinite;
    }

    .dot-pulse-red {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #FEE2E2;
      box-shadow: 0 0 6px #FFFFFF;
    }

    .pin-stem-red {
      width: 3px;
      height: 14px;
      background: #DC2626;
    }

    .pin-dot-anchor-red {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #DC2626;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }

    /* Green Destination Sign */
    .badge-sign-green {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #16A34A;
      color: #FFFFFF;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.45);
      border: 2px solid #FFFFFF;
      white-space: nowrap;
      animation: bounceSign 2s ease-in-out infinite;
      animation-delay: 1s;
    }

    .dot-pulse-green {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #DCFCE7;
      box-shadow: 0 0 6px #FFFFFF;
    }

    .pin-stem-green {
      width: 3px;
      height: 14px;
      background: #16A34A;
    }

    .pin-dot-anchor-green {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #16A34A;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }

    .dest-thumb-badge {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #FFFFFF;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }

    @keyframes bounceSign {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    /* Vehicle Live Tracking Marker */
    .vehicle-marker-box {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    }

    .vehicle-puck {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 3px solid #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.55);
      z-index: 10;
      overflow: hidden;
    }

    .vehicle-img-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vehicle-pulse {
      position: absolute;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.25);
      animation: pulseRipple 1.8s ease-out infinite;
      z-index: 1;
    }

    @keyframes pulseRipple {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .vehicle-tooltip {
      position: absolute;
      bottom: -22px;
      background: rgba(15, 23, 42, 0.88);
      color: #FFFFFF;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 9.5px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    /* Google Logo Watermark */
    .google-watermark {
      position: absolute;
      bottom: 8px;
      left: 10px;
      z-index: 999;
      background: rgba(255, 255, 255, 0.88);
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #5F6368;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .google-g { color: #4285F4; }
    .google-o1 { color: #EA4335; }
    .google-o2 { color: #FBBC05; }
    .google-g2 { color: #4285F4; }
    .google-l { color: #34A853; }
    .google-e { color: #EA4335; }

    /* Custom Map Controls Overlay */
    .map-controls-group {
      position: absolute;
      right: 12px;
      bottom: 14px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .map-ctrl-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      color: #0F172A;
      transition: all 0.15s ease;
    }

    .map-ctrl-btn:hover {
      background: #F8FAFC;
      transform: scale(1.05);
    }

    .map-ctrl-btn:active {
      transform: scale(0.95);
    }

    /* Route info bar overlay */
    .route-info-overlay {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 999;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      padding: 7px 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 4px 14px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .route-badge-red-mini {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10.5px;
      font-weight: 800;
      color: #DC2626;
    }

    .route-badge-arrow {
      color: #94A3B8;
      font-size: 11px;
      font-weight: 800;
    }

    .route-badge-green-mini {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10.5px;
      font-weight: 800;
      color: #16A34A;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Google Branding Watermark -->
  <div class="google-watermark">
    <span class="google-g">G</span><span class="google-o1">o</span><span class="google-o2">o</span><span class="google-g2">g</span><span class="google-l">l</span><span class="google-e">e</span>
    <span style="font-size: 9px; color: #70757a; margin-left: 2px;">Maps</span>
  </div>

  <!-- Route Legend Badge -->
  <div class="route-info-overlay">
    <span class="route-badge-red-mini"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#DC2626;margin-right:4px;"></span>DEPARTURE</span>
    <span class="route-badge-arrow">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </span>
    <span class="route-badge-green-mini"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16A34A;margin-right:4px;"></span>DESTINATION</span>
  </div>

  <!-- Navigation Action Buttons -->
  <div class="map-controls-group">
    <button class="map-ctrl-btn" onclick="if(map)map.zoomIn()" title="Zoom In">+</button>
    <button class="map-ctrl-btn" onclick="if(map)map.zoomOut()" title="Zoom Out">&minus;</button>
    <button class="map-ctrl-btn" onclick="centerVehicle()" title="Center on Vehicle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg></button>
    <button class="map-ctrl-btn" onclick="fitFullRoute()" title="View Full Route"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></button>
  </div>

  <script>
    const originLat = ${oLat};
    const originLng = ${oLng};
    const destLat = ${dLat};
    const destLng = ${dLng};
    const originName = '${oName}';
    const destName = '${dName}';
    const routePoints = ${routePointsJson};
    const vehiclePos = ${vehiclePosJson};
    const hasValidDest = ${hasValidDest};

    let map = null;
    let vehicleMarker = null;

    function initJourneyMap() {
      if (typeof L === 'undefined' || !L.map) {
        setTimeout(initJourneyMap, 60);
        return;
      }
      if (map) return;

      try {
        const initialCenter = hasValidDest
          ? [(originLat + destLat) / 2, (originLng + destLng) / 2]
          : [originLat, originLng];
        const initialZoom = hasValidDest ? 13 : 15;

        map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
        }).setView(initialCenter, initialZoom);

        // High-reliability multi-tier tiles (100% Free, zero-API-key, no-watermark Esri & OpenStreetMap tiles)
        let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
        let tileMaxZoom = 19;

        ${mapTheme === 'satellite' ? `
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
          tileMaxZoom = 19;
        ` : mapTheme === 'night' ? `
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
          tileMaxZoom = 16;
        ` : `
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
          tileMaxZoom = 19;
        `}

        const baseTileLayer = L.tileLayer(tileUrl, {
          maxZoom: tileMaxZoom,
          attribution: '&copy; Esri &copy; OpenStreetMap contributors'
        });

        // Fail-proof tile fallback: OpenStreetMap standard if any tile fails
        baseTileLayer.on('tileerror', function(error, tile) {
          if (tile && error && error.coords) {
            tile.src = 'https://tile.openstreetmap.org/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
          }
        });

        baseTileLayer.addTo(map);

    // 2. RED Departure Sign Marker
    const departureIcon = L.divIcon({
      className: 'custom-departure-pin',
      html: \`
        <div class="sign-container">
          <div class="badge-sign-red">
            <span class="dot-pulse-red"></span>
            <span>DEPARTURE</span>
          </div>
          <div class="pin-stem-red"></div>
          <div class="pin-dot-anchor-red"></div>
        </div>
      \`,
      iconSize: [120, 52],
      iconAnchor: [60, 52]
    });

    const departureMarker = L.marker([originLat, originLng], { icon: departureIcon }).addTo(map);
    departureMarker.bindPopup('<b style="color: #DC2626;">Departure Point</b><br/>' + originName + '<br/><span style="font-size:11px; color:#64748B;">GPS: ' + originLat.toFixed(4) + ', ' + originLng.toFixed(4) + '</span>');

    let vehicleMarker = null;

    if (hasValidDest) {
      // 1. Google Maps Navigation Polyline (Google Navigation Blue with outer casing)
      L.polyline(routePoints, {
        color: '${mapTheme === 'night' ? '#1E3A8A' : '#1D4ED8'}',
        weight: 8,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Inner vibrant route line
      L.polyline(routePoints, {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 3. GREEN Destination Sign Marker
      const destinationIcon = L.divIcon({
        className: 'custom-destination-pin',
        html: '<div class="sign-container"><div class="badge-sign-green">' + ${JSON.stringify(destBadgeHtml)} + '</div><div class="pin-stem-green"></div><div class="pin-dot-anchor-green"></div></div>',
        iconSize: [${destIconWidth}, 56],
        iconAnchor: [${destIconAnchorX}, 56]
      });

      const destinationMarker = L.marker([destLat, destLng], { icon: destinationIcon }).addTo(map);
      destinationMarker.bindPopup(
        '<b style="color: #16A34A; font-size:13.5px;">Destination Point</b><br/>' +
        ${JSON.stringify(destPopupImageHtml)} +
        '<span style="font-weight:700; color:#0F172A;">' + destName + '</span><br/><span style="font-size:11px; color:#64748B;">GPS: ' + destLat.toFixed(4) + ', ' + destLng.toFixed(4) + '</span>'
      );

      // 4. Vehicle / Traveler Live Marker with crisp vector puck
      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: '<div class="vehicle-marker-box"><div class="vehicle-pulse"></div><div class="vehicle-puck">' + ${JSON.stringify(vehicleSvg)} + '</div><div class="vehicle-tooltip" id="vehicle-tooltip-text">' + '${modeLabel}' + ' • ' + ${remainingDistanceKm} + 'km left</div></div>',
        iconSize: [54, 54],
        iconAnchor: [27, 27]
      });

      vehicleMarker = L.marker(vehiclePos, { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
      vehicleMarker.bindPopup(
        '<b style="font-size:13.5px; color:#2563EB;">🚗 Live GPS Vehicle</b><br/>' +
        '<div style="display:flex; align-items:center; gap:8px; margin:8px 0; background:#EFF6FF; padding:8px; border-radius:8px;">' + ${JSON.stringify(vehicleSvg)} + '<b style="font-size:13px; color:#1E3A8A;">Mode: ' + '${modeLabel}' + '</b></div>' +
        '<span style="font-size:11px; color:#64748B;">En route to ' + destName + ' (~${remainingMinutes}m)</span>'
      );

      // Fit bounds to encompass both departure and destination with generous padding
      const bounds = L.latLngBounds([
        [originLat, originLng],
        [destLat, destLng],
        vehiclePos
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // No destination chosen yet: show Departure zone with pulsing safe perimeter
      L.circle([originLat, originLng], {
        radius: 150,
        color: '#369E33',
        fillColor: '#42B83F',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(map);
      map.setView([originLat, originLng], 15);
    }

    // Interactive helper functions
    function centerVehicle() {
      if (vehicleMarker) {
        map.flyTo(vehicleMarker.getLatLng(), 15, { animate: true, duration: 1 });
      }
    }

    function fitFullRoute() {
      if (hasValidDest) {
        const routeBounds = L.latLngBounds([
          [originLat, originLng],
          [destLat, destLng]
        ]);
        map.flyToBounds(routeBounds, { padding: [50, 50], animate: true, duration: 1 });
      } else {
        map.flyTo([originLat, originLng], 15, { animate: true, duration: 1 });
      }
    }

    // Critical fix: ensure Leaflet calculates correct container size inside iframe & redraws
    function forceMapInvalidate() {
      try {
        map.invalidateSize();
        if (hasValidDest) {
          const allBounds = L.latLngBounds(routePoints);
          allBounds.extend([originLat, originLng]);
          allBounds.extend([destLat, destLng]);
          map.fitBounds(allBounds, { padding: [50, 50] });
        }
      } catch (e) {}
    }

    // Smooth real-time telemetry position updater without iframe reload
    window.addEventListener('message', function(event) {
      try {
        if (!event.data) return;
        if (event.data.type === 'UPDATE_VEHICLE_POSITION') {
          const p = event.data.position;
          if (p && Array.isArray(p) && typeof vehicleMarker !== 'undefined') {
            vehicleMarker.setLatLng(p);
            const tt = document.getElementById('vehicle-tooltip-text');
            if (tt && event.data.distanceKm !== undefined) {
              tt.innerText = '${modeLabel}' + ' • ' + event.data.distanceKm + 'km left';
            }
          }
        }
      } catch (err) {}
    });

      } catch (err) {
        console.warn('Leaflet init error:', err);
      }
    }

    // Trigger resilient initialization
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initJourneyMap);
    } else {
      initJourneyMap();
    }
    setTimeout(initJourneyMap, 50);
    setTimeout(initJourneyMap, 200);

    window.addEventListener('load', function() {
      setTimeout(forceMapInvalidate, 80);
      setTimeout(forceMapInvalidate, 250);
      setTimeout(forceMapInvalidate, 600);
      setTimeout(forceMapInvalidate, 1200);
    });
    window.addEventListener('resize', forceMapInvalidate);

    // Forward mouse wheel events so user can scroll the entire page freely over the journey map
    window.addEventListener('wheel', function(e) {
      try {
        window.parent.postMessage({
          type: 'SAFE_PAGE_SCROLL',
          deltaY: e.deltaY
        }, '*');
      } catch (err) {}
    }, { passive: true });
  </script>
</body>
</html>
    `;
  }, [
    oLat,
    oLng,
    oName,
    oAddr,
    dLat,
    dLng,
    dName,
    dAddr,
    routePoints,
    vehicleSvg,
    modeLabel,
    isVijayawadaDest,
    mapTheme,
    hasValidDest,
  ]);

  const iframeRef = useRef<any>(null);

  // Send smooth position updates to Leaflet marker inside iframe without re-rendering the iframe
  useEffect(() => {
    if (iframeRef.current) {
      const cw = iframeRef.current.contentWindow || iframeRef.current;
      if (cw && typeof cw.postMessage === 'function') {
        cw.postMessage(
          {
            type: 'UPDATE_VEHICLE_POSITION',
            position: currentVehiclePos,
            distanceKm: remainingDistanceKm,
            progress: progressPercent,
          },
          '*'
        );
      }
    }
  }, [currentVehiclePos, remainingDistanceKm, progressPercent]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWheelScroll = (e: MessageEvent) => {
      if (e.data?.type === 'SAFE_PAGE_SCROLL' && typeof e.data.deltaY === 'number') {
        const scrollTarget =
          document.querySelector('[data-scroll-container="true"]') ||
          document.scrollingElement ||
          document.documentElement ||
          document.body;
        if (scrollTarget && typeof (scrollTarget as any).scrollBy === 'function') {
          (scrollTarget as any).scrollBy({ top: e.data.deltaY, behavior: 'auto' });
        } else {
          window.scrollBy({ top: e.data.deltaY, behavior: 'auto' });
        }
      }
    };

    window.addEventListener('message', handleWheelScroll);
    return () => window.removeEventListener('message', handleWheelScroll);
  }, []);

  return (
    <View style={styles.cardContainer}>
      {/* Map Header Toolbar with Theme Switcher */}
      <View style={styles.mapHeaderBar}>
        <View style={styles.headerLeft}>
          <View style={styles.googleIconBadge}>
            <Ionicons name="map" size={15} color={COLORS.bluePrimary} />
          </View>
          <View>
            <Text style={styles.mapHeaderTitle}>Live Route Navigation</Text>
            <Text style={styles.mapHeaderSubtitle}>
              Departure • Destination • Real-Time Route
            </Text>
          </View>
        </View>

        {/* Map Theme Selector: Street / Night / Satellite */}
        <View style={styles.themeSelectorGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setMapTheme('street')}
            style={[styles.themeBtn, mapTheme === 'street' && styles.themeBtnActive]}
          >
            <Text style={[styles.themeBtnText, mapTheme === 'street' && styles.themeBtnTextActive]}>
              Street
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setMapTheme('night')}
            style={[styles.themeBtn, mapTheme === 'night' && styles.themeBtnActive]}
          >
            <Text style={[styles.themeBtnText, mapTheme === 'night' && styles.themeBtnTextActive]}>
              Night
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setMapTheme('satellite')}
            style={[styles.themeBtn, mapTheme === 'satellite' && styles.themeBtnActive]}
          >
            <Text style={[styles.themeBtnText, mapTheme === 'satellite' && styles.themeBtnTextActive]}>
              Satellite
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Frame */}
      <View style={[styles.mapViewport, { height }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            title: 'Google Maps Active Journey',
            srcDoc: mapHtml,
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0 0 16px 16px',
            },
          })
        ) : (
          <View style={styles.nativeFallback}>
            <Ionicons name="map-outline" size={48} color={COLORS.bluePrimary} />
            <Text style={styles.nativeFallbackTitle}>Live Google Map View</Text>
            <Text style={styles.nativeFallbackDesc}>
              Start: {origin.name} • Dest: {destination.name}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Status Legend Footer */}
      <View style={styles.mapFooterRow}>
        <View style={styles.legendItem}>
          <View style={styles.legendDotRed} />
          <Text style={styles.legendText}>
            Departure: <Text style={styles.legendBold}>{origin.name}</Text>
          </Text>
        </View>

        <View style={styles.legendDivider} />

        <View style={styles.legendItem}>
          <View style={styles.legendDotGreen} />
          <Text style={styles.legendText}>
            Destination: <Text style={styles.legendBold}>{destination.name}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  mapHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  googleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    letterSpacing: -0.2,
  },
  mapHeaderSubtitle: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  themeSelectorGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 2.5,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  themeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  themeBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.subtle,
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  themeBtnTextActive: {
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  mapViewport: {
    width: '100%',
    backgroundColor: '#E5E3DF',
    position: 'relative',
  },
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  nativeFallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navyPrimary,
    marginTop: 8,
  },
  nativeFallbackDesc: {
    fontSize: 13,
    color: COLORS.grayTextSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  mapFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  legendDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  legendText: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
  },
  legendBold: {
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  legendDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
});
