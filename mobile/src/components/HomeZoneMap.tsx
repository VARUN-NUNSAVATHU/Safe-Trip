import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';

export interface HomeZoneMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
  address?: string;
  onLocationChange?: (lat: number, lon: number) => void;
  height?: number;
}

export const HomeZoneMap: React.FC<HomeZoneMapProps> = ({
  latitude,
  longitude,
  radiusMeters,
  locationName = 'Home Sanctuary',
  address = 'Home Geofence Center',
  onLocationChange,
  height = 320,
}) => {
  const [mapTheme, setMapTheme] = useState<'street' | 'satellite' | 'night'>('street');

  // Listen for message from iframe when user clicks on map to reposition home
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'HOME_ZONE_MAP_CLICK' && data.lat && data.lng) {
          if (onLocationChange) {
            onLocationChange(Number(data.lat.toFixed(5)), Number(data.lng.toFixed(5)));
          }
        } else if (data && data.type === 'SAFE_PAGE_SCROLL' && typeof data.deltaY === 'number') {
          const scrollTarget =
            document.querySelector('[data-scroll-container="true"]') ||
            document.scrollingElement ||
            document.documentElement ||
            document.body;
          if (scrollTarget && typeof (scrollTarget as any).scrollBy === 'function') {
            (scrollTarget as any).scrollBy({ top: data.deltaY, behavior: 'auto' });
          } else {
            window.scrollBy({ top: data.deltaY, behavior: 'auto' });
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLocationChange]);

  const mapHtml = useMemo(() => {
    const lat = latitude || 16.4614;
    const lng = longitude || 80.5069;
    const radius = radiusMeters || 200;
    const cleanName = (locationName || 'Home Sanctuary').replace(/['"]/g, '');
    const cleanAddr = (address || '').replace(/['"]/g, '');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Home Zone Interactive Map</title>
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
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #e2e8f0; }

    .leaflet-tile {
      ${mapTheme === 'night' ? 'filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);' : ''}
    }

    /* Interactive Home Pin Marker */
    .home-marker-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
    }

    .home-badge-sign {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #369E33;
      color: #FFFFFF;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(66, 184, 63, 0.45);
      border: 2px solid #FFFFFF;
      white-space: nowrap;
      animation: bouncePin 2.2s ease-in-out infinite;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #C2EFC0;
      box-shadow: 0 0 6px #FFFFFF;
    }

    .pin-stem {
      width: 3px;
      height: 14px;
      background: #369E33;
    }

    .pin-dot-anchor {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #42B83F;
      border: 3px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }

    @keyframes bouncePin {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    .info-floating-hint {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      color: #FFFFFF;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.4px;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="info-floating-hint">Tap map to set your Home Zone</div>

  <script>
    var homeLat = ${lat};
    var homeLng = ${lng};
    var geofenceRadius = ${radius};
    var map = null;
    var homeMarker = null;
    var geofenceCircle = null;

    function initHomeMap() {
      if (typeof L === 'undefined' || !L.map) {
        setTimeout(initHomeMap, 60);
        return;
      }
      if (map) return;

      try {
        map = L.map('map', {
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: false
        }).setView([homeLat, homeLng], 15);

        // Dynamic tile layers based on chosen map theme (100% Free, zero-API-key, no-watermark Esri & OpenStreetMap tiles)
        var tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
        var maxZoom = 19;

        ${mapTheme === 'satellite' ? `
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
          maxZoom = 19;
        ` : mapTheme === 'night' ? `
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
          maxZoom = 16;
        ` : `
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
          maxZoom = 19;
        `}

        var baseTiles = L.tileLayer(tileUrl, {
          maxZoom: maxZoom,
          attribution: '&copy; Esri &copy; OpenStreetMap contributors'
        });

        // Fail-proof tile fallback: OpenStreetMap standard if any tile fails
        baseTiles.on('tileerror', function(error, tile) {
          if (tile && error && error.coords) {
            tile.src = 'https://tile.openstreetmap.org/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
          }
        });

        baseTiles.addTo(map);

    // Geofence Circle Overlay
    var geofenceCircle = L.circle([homeLat, homeLng], {
      radius: geofenceRadius,
      color: '#369E33',
      fillColor: '#42B83F',
      fillOpacity: 0.22,
      weight: 2.5,
      dashArray: '6, 6'
    }).addTo(map);

    // Custom Home Pin Marker
    var homeIcon = L.divIcon({
      className: 'custom-home-pin',
      html: \`
        <div class="home-marker-wrap">
          <div class="home-badge-sign">
            <span class="pulse-dot"></span>
            <span>HOME ZONE</span>
          </div>
          <div class="pin-stem"></div>
          <div class="pin-dot-anchor"></div>
        </div>
      \`,
      iconSize: [120, 56],
      iconAnchor: [60, 56]
    });

    var homeMarker = L.marker([homeLat, homeLng], {
      icon: homeIcon,
      draggable: true
    }).addTo(map);

    homeMarker.bindPopup(
      '<b style="color:#369E33; font-size:13px;">🏡 ${cleanName}</b><br/>' +
      '<span style="font-size:11.5px; color:#334155;">${cleanAddr}</span><br/>' +
      '<span style="font-size:11px; color:#64748B;">GPS: ' + homeLat.toFixed(5) + ', ' + homeLng.toFixed(5) + '</span><br/>' +
      '<span style="font-size:11px; font-weight:700; color:#369E33;">Perimeter: ' + geofenceRadius + ' meters</span>'
    ).openPopup();

    function updateMarkerPos(newLat, newLng) {
      homeMarker.setLatLng([newLat, newLng]);
      geofenceCircle.setLatLng([newLat, newLng]);
      map.panTo([newLat, newLng]);

      try {
        window.parent.postMessage(JSON.stringify({
          type: 'HOME_ZONE_MAP_CLICK',
          lat: newLat,
          lng: newLng
        }), '*');
      } catch (e) {}
    }

    // Map click allows user to tap anywhere to place home pin
    map.on('click', function(e) {
      updateMarkerPos(e.latlng.lat, e.latlng.lng);
    });

    // Drag marker support
    homeMarker.on('dragend', function(e) {
      var coord = e.target.getLatLng();
      updateMarkerPos(coord.lat, coord.lng);
    });

      } catch (err) {
        console.warn('HomeZone map init error:', err);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHomeMap);
    } else {
      initHomeMap();
    }
    setTimeout(initHomeMap, 50);
    setTimeout(initHomeMap, 200);

    // Auto-invalidate sizing to prevent grey tiles in iframes
    function invalidate() {
      try {
        if (map) map.invalidateSize();
      } catch (err) {}
    }

    window.addEventListener('load', function() {
      setTimeout(invalidate, 80);
      setTimeout(invalidate, 250);
      setTimeout(invalidate, 600);
      setTimeout(invalidate, 1200);
    });
    window.addEventListener('resize', invalidate);

    // Forward mouse wheel events so user can scroll the entire page freely over the map
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
  }, [latitude, longitude, radiusMeters, locationName, address, mapTheme]);

  return (
    <View style={styles.container}>
      {/* Top Map Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={16} color={COLORS.tealPrimary} />
          </View>
          <View>
            <Text style={styles.mapTitle}>Live Home Geofence Map</Text>
            <Text style={styles.mapSubtitle}>
              {radiusMeters}m radius • Tap map to place home
            </Text>
          </View>
        </View>

        {/* Theme Selector */}
        <View style={styles.themeGroup}>
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
            onPress={() => setMapTheme('satellite')}
            style={[styles.themeBtn, mapTheme === 'satellite' && styles.themeBtnActive]}
          >
            <Text style={[styles.themeBtnText, mapTheme === 'satellite' && styles.themeBtnTextActive]}>
              Sat
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
        </View>
      </View>

      {/* Map Frame */}
      <View style={[styles.mapFrame, { height }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            title: 'Home Zone Interactive Leaflet Map',
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
            <Ionicons name="navigate-circle" size={42} color={COLORS.tealPrimary} />
            <Text style={styles.nativeTitle}>Geofence Perimeter Active</Text>
            <Text style={styles.nativeSubtitle}>
              {radiusMeters}m safe perimeter centered at {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    overflow: 'hidden',
    marginVertical: SPACING.md,
    ...SHADOWS.card,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mapSubtitle: {
    fontSize: 11,
    color: COLORS.grayTextSecondary,
  },
  themeGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  themeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  themeBtnActive: {
    backgroundColor: COLORS.tealPrimary,
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  themeBtnTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  mapFrame: {
    width: '100%',
    backgroundColor: COLORS.grayLight,
    overflow: 'hidden',
  },
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.tealSoft,
  },
  nativeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  nativeSubtitle: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
