import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  LIMA_DEFAULT,
  buildNominatimSearchUrl,
  formatShopPoint,
  parseGeolocationPosition,
  parseNominatimResults,
  type AddressSuggestion,
  type ShopPoint,
} from './shop-location';

/**
 * Admin map picker for the shop point. Free stack only: Leaflet renders
 * OpenStreetMap tiles, no API key and no paid map vendor. The marker is a
 * local div icon, so no image assets are required.
 *
 * Fast paths besides the map: address search via the free Nominatim endpoint
 * (https://nominatim.openstreetmap.org, no key, debounced) and the browser
 * geolocation ("Usar mi ubicación actual"). The map stays as visual
 * confirmation only; persistence flows through onChange as before. The
 * selected display address is a separate durable value; typing alone never
 * changes it.
 */

/** Delay before firing the address search while the admin keeps typing. */
const SEARCH_DEBOUNCE_MS = 400;

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
  address,
  onAddressChange,
  disabled = false,
}: {
  value: ShopPoint | null;
  onChange: (point: ShopPoint | null) => void;
  address: string | null;
  onAddressChange: (address: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAddressChangeRef = useRef(onAddressChange);
  onAddressChangeRef.current = onAddressChange;

  const [query, setQuery] = useState(address ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    setQuery(address ?? '');
  }, [address]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      const seq = searchSeqRef.current + 1;
      searchSeqRef.current = seq;
      fetch(buildNominatimSearchUrl(text), { headers: { Accept: 'application/json', 'Accept-Language': 'es' } })
        .then((response) => {
          if (!response.ok) throw new Error(`search ${response.status}`);
          return response.json();
        })
        .then((data: unknown) => {
          if (searchSeqRef.current !== seq) return;
          setSuggestions(parseNominatimResults(data));
          setSearching(false);
        })
        .catch(() => {
          if (searchSeqRef.current !== seq) return;
          setSuggestions([]);
          setSearching(false);
          setSearchError('No pudimos buscar la dirección. Revisa tu conexión o toca el mapa.');
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  function pickSuggestion(suggestion: AddressSuggestion) {
    setQuery(suggestion.label);
    setSuggestions([]);
    setSearchError(null);
    onChangeRef.current(suggestion.point);
    onAddressChangeRef.current(suggestion.label);
  }

  function useCurrentLocation() {
    const geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geolocation) {
      setGeoError('Tu navegador no permite usar la ubicación. Toca el mapa para fijar el punto.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const point = parseGeolocationPosition(position);
        if (point) onChangeRef.current(point);
        else setGeoError('No pudimos obtener tu ubicación. Toca el mapa para fijar el punto.');
      },
      () => {
        setLocating(false);
        setGeoError(
          'No pudimos obtener tu ubicación. Revisa el permiso del navegador o toca el mapa para fijar el punto.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

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
      {!disabled ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="shop-address-search" style={{ font: 'var(--text-body)' }}>
            Buscar dirección
          </label>
          <input
            id="shop-address-search"
            type="search"
            autoComplete="off"
            placeholder="Escribe la dirección del local…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              font: 'var(--text-body)',
              minHeight: 40,
              padding: '0 12px',
              width: '100%',
            }}
          />
          {searching ? (
            <p className="muted" role="status" style={{ font: 'var(--text-body)', margin: 0 }}>
              Buscando…
            </p>
          ) : null}
          {searchError ? (
            <p className="auth__error" role="alert" style={{ font: 'var(--text-body)', margin: 0 }}>
              {searchError}
            </p>
          ) : null}
          {!searching && !searchError && query.trim().length >= 3 && suggestions.length === 0 ? (
            <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
              Sin resultados. Prueba con otra dirección o toca el mapa.
            </p>
          ) : null}
          {suggestions.length > 0 ? (
            <ul
              aria-label="Sugerencias de dirección"
              style={{ display: 'grid', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(suggestion)}
                    style={{
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      font: 'var(--text-body)',
                      minHeight: 40,
                      padding: '8px 12px',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
            Búsqueda © OpenStreetMap · Nominatim.
          </p>
          <div>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                cursor: locating ? 'wait' : 'pointer',
                minHeight: 40,
                padding: '0 12px',
              }}
            >
              {locating ? 'Ubicando…' : 'Usar mi ubicación actual'}
            </button>
          </div>
          {geoError ? (
            <p className="auth__error" role="alert" style={{ font: 'var(--text-body)', margin: 0 }}>
              {geoError}
            </p>
          ) : null}
        </div>
      ) : null}
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
             Quitar punto (solo quita las coordenadas; conserva la dirección)
          </button>
        </div>
      ) : null}
    </div>
  );
}
