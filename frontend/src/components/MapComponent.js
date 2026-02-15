import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'dotenv/config';

function MapComponent({ onLocationSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);
  const incidentMarker = useRef(null);

  const [centerLngLat, setCenterLngLat] = useState([-77.0365, 38.8977]);
  const [geocodeData, setGeocodeData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Amazon Location Service config
  const apiKey = process.env.API_KEY;
  const region = "us-east-1";

  // Get user's current position
  const getCurrentPositionAsync = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Reverse geocode function (for future enhancement)
  const reverseGeocodeAt = async (lng, lat) => {
    try {
      // This would use Amazon Location Service to get address details
      // For now, we'll just store the coordinates
      const data = {
        coordinates: { lat, lng },
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      };
      setGeocodeData(data);
      return data;
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeData({ error: error.message });
    }
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Only initialize once

    const initMap = async () => {
      // Get user location
      let initialCenter = [-77.0365, 38.8977]; // Fallback to GMU campus
      
      try {
        const pos = await getCurrentPositionAsync({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        });
        initialCenter = [pos.coords.longitude, pos.coords.latitude];
        setCenterLngLat(initialCenter);
      } catch (e) {
        console.warn("Geolocation failed, using fallback:", e.message);
      }

      // Create map
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        center: initialCenter,
        zoom: 16,
        style: `https://maps.geo.${region}.amazonaws.com/v2/styles/Standard/descriptor?key=${apiKey}`,
        validateStyle: false,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-left");
      map.current.on("error", (e) => console.error("Map error:", e?.error || e));

      // When map loads, add markers
      map.current.on("load", () => {
        // Blue user marker (shows your current location)
        userMarker.current = new maplibregl.Marker({ color: "blue" })
          .setLngLat(initialCenter)
          .addTo(map.current);

        // Red incident marker (starts at user location)
        incidentMarker.current = new maplibregl.Marker({ color: "red" })
          .setLngLat(initialCenter)
          .addTo(map.current);

        // Notify parent component
        const location = { lng: initialCenter[0], lat: initialCenter[1] };
        onLocationSelect && onLocationSelect(location);
        reverseGeocodeAt(initialCenter[0], initialCenter[1]);
        setLoading(false);
      });

      // Click handler - move red marker and update incident location
      map.current.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        
        // Move red marker
        if (incidentMarker.current) {
          incidentMarker.current.setLngLat([lng, lat]);
        }
        
        // Notify parent component
        const location = { lng, lat };
        onLocationSelect && onLocationSelect(location);
        reverseGeocodeAt(lng, lat);
      });
    };

    initMap();

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onLocationSelect]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-lg font-semibold text-gray-700">Loading map...</div>
        </div>
      )}
      
      {/* Map instructions */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-semibold text-sm mb-2">Map Instructions</h3>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>🔵 <strong>Blue marker:</strong> Your current location</li>
          <li>🔴 <strong>Red marker:</strong> Incident location</li>
          <li>👆 <strong>Click</strong> anywhere on the map to set incident location</li>
          <li>🖱️ <strong>Pan & zoom</strong> to navigate the map</li>
        </ul>
      </div>
    </div>
  );
}

export default MapComponent;
