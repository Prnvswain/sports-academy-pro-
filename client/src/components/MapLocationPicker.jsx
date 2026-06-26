import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView({ position, onPositionChange }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    onPositionChange([lat, lng]);
  };

  useEffect(() => {
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onPositionChange]);

  return null;
}

export default function MapLocationPicker({ isOpen, onClose, onSelect, initialAddress }) {
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialAddress) {
      setSearchQuery(initialAddress);
    }
  }, [isOpen, initialAddress]);

  const handleSearch = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const provider = new OpenStreetMapProvider();
      const results = await provider.search({ query });
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (result) => {
    const { x, y, label } = result;
    setPosition([y, x]);
    setSearchQuery(label);
    setSearchResults([]);
  };

  const handleConfirm = () => {
    if (searchQuery) {
      onSelect(searchQuery);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
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
          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Search for address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-surface border-border mb-4 max-h-48 overflow-y-auto rounded-lg border">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full border-border border-b px-4 py-2 text-left hover:bg-accent/10 last:border-b-0"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="font-medium">{result.label}</div>
                </button>
              ))}
            </div>
          )}

          {/* Map */}
          <div className="border-border h-80 rounded-lg border overflow-hidden">
            <MapContainer
              center={position || [19.0760, 72.8777]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {position && <Marker position={position} />}
              <MapView position={position} onPositionChange={setPosition} />
            </MapContainer>
          </div>

          <p className="text-muted text-xs mt-2">
            Click on the map or search to select a location
          </p>
        </div>

        <div className="border-border flex justify-end gap-3 border-t p-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!searchQuery}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
