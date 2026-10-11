import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { LIMA_DEFAULT, formatShopPoint, type ShopPoint } from './shop-location';

/**
 * Admin map picker for the shop point. Free stack only: Leaflet renders
 * OpenStreetMap tiles, no API key and no paid map vendor. The marker is a
 * local div icon, so no image assets are required.
 */

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function createPin(): L.DivIcon {
  return L.divIcon({
    className: 'shop-pin',
    html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#0d9488;border:3px solid #ffffff;box-shadow:0 1px 6px rgba(0,0,0,0.35);"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function ShopLocationPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ShopPoint | null;
  onChange: (point: ShopPoint | null) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([LIMA_DEFAULT.lat, LIMA_DEFAULT.lng], 13);
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (disabled) map.dragging.disable();
    else map.dragging.enable();

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const marker = L.marker([value.lat, value.lng], { icon: createPin(), draggable: !disabled });
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChangeRef.current({ lat: position.lat, lng: position.lng });
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
      if (markerRef.current.dragging) {
        if (disabled) markerRef.current.dragging.disable();
        else markerRef.current.dragging.enable();
      }
    }
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 14));
  }, [value, disabled]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong style={{ font: 'var(--text-body)' }}>Ubicación del local</strong>
      <div
        ref={containerRef}
        role="application"
        aria-label="Mapa para fijar la ubicación del local"
        style={{
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          height: 280,
          width: '100%',
          zIndex: 0,
        }}
      />
      <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
        {value ? (
          <>Punto actual: {formatShopPoint(value)}. Toca el mapa o arrastra el punto para moverlo.</>
        ) : (
          <>Sin punto registrado. Toca el mapa para fijar la ubicación del local.</>
        )}
      </p>
      {value && !disabled ? (
        <div>
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              cursor: 'pointer',
              minHeight: 40,
              padding: '0 12px',
            }}
          >
            Quitar punto
          </button>
        </div>
      ) : null}
    </div>
  );
}
