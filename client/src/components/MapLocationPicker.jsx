import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [19.076, 72.8777];

export default function MapLocationPicker({
  isOpen,
  onClose,
  onSelect,
  initialAddress,
  initialLocation,
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const mapRef = useRef(null);
  const geocodeRequestIdRef = useRef(0);

  // Reverse geocode using OpenStreetMap Nominatim API
  const reverseGeocode = async (lat, lng) => {
    const requestId = (geocodeRequestIdRef.current += 1);
    setIsGeocoding(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SportsAcademyMapPicker/1.0',
          },
        }
      );
      const data = await response.json();

      if (requestId !== geocodeRequestIdRef.current) return;

      if (data && data.display_name) {
        setInputValue(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Forward geocode using OpenStreetMap Nominatim API
  const forwardGeocode = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'SportsAcademyMapPicker/1.0',
          },
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const newCenter = [lat, lng];
        setMapCenter(newCenter);
        setSelectedLocation({ lat, lng });
        
        if (mapRef.current) {
          mapRef.current.setView(newCenter, 16);
        }
      }
    } catch (error) {
      console.error('Forward geocoding error:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setSelectedLocation(null);
      setMapCenter(DEFAULT_CENTER);
      return;
    }

    setInputValue(initialAddress || '');

    if (initialLocation?.lat != null && initialLocation?.lng != null) {
      const newCenter = [initialLocation.lat, initialLocation.lng];
      setMapCenter(newCenter);
      setSelectedLocation({ lat: initialLocation.lat, lng: initialLocation.lng });
      
      if (mapRef.current) {
        mapRef.current.setView(newCenter, 16);
      }
    } else if (initialAddress) {
      forwardGeocode(initialAddress);
    }
  }, [isOpen, initialAddress, initialLocation]);

  const handleMapLoad = (map) => {
    mapRef.current = map;

    // Listen to moveend event (when dragging stops)
    map.on('moveend', () => {
      const center = map.getCenter();
      if (center) {
        const lat = center.lat;
        const lng = center.lng;
        setSelectedLocation({ lat, lng });
        reverseGeocode(lat, lng);
      }
    });
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedLocation(null);
    setMapCenter(DEFAULT_CENTER);
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, 13);
    }
  };

  const handleConfirm = () => {
    if (!inputValue || !selectedLocation) return;
    onSelect({ address: inputValue, location: selectedLocation });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-surface border-border max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b p-4">
          <h3 className="font-bold text-lg">Select Sport Center Location</h3>
          <button
            type="button"
            className="text-muted hover:text-foreground transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              className="input-field w-full pr-14"
              placeholder="Search for an address..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue) {
                  forwardGeocode(inputValue);
                }
              }}
            />

            {inputValue ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                onClick={handleClear}
              >
                ✖️
              </button>
            ) : null}

            {isGeocoding ? (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : null}
          </div>

          <div className="border-border relative h-80 overflow-hidden rounded-lg border">
            {/* Uber-style center pin marker - fixed position, doesn't move with map */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full text-3xl drop-shadow-lg">
              📍
            </div>

            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              whenReady={(e) => handleMapLoad(e.target)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </MapContainer>
          </div>

          <p className="text-muted text-xs mt-2">
            Drag the map to position the pin. The address will auto-fill.
          </p>
        </div>

        <div className="border-border flex justify-end gap-3 border-t p-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!inputValue || !selectedLocation}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
