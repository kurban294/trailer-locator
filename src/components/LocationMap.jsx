import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/leaflet.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278
};

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

const LocationMap = memo(({ center = defaultCenter, markers = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Initialize map only once
  useEffect(() => {
    if (!mapInstanceRef.current) {
      const map = L.map('map', {
        center: [center.lat, center.lng],
        zoom: 18,
        zoomControl: true,
        maxZoom: 19
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Handle center and markers updates
  useEffect(() => {
    if (mapInstanceRef.current) {
      // Update center
      if (center && center.lat && center.lng) {
        mapInstanceRef.current.setView([center.lat, center.lng], 18, {
          animate: false // Disable animation for better performance
        });
      }

      // Clear existing markers
      if (mapRef.current) {
        mapRef.current.forEach(marker => marker.remove());
      }
      mapRef.current = [];

      // Add new markers
      markers.forEach(marker => {
        if (marker.position && marker.position.lat && marker.position.lng) {
          const m = L.marker([marker.position.lat, marker.position.lng]);
          if (marker.popup) {
            m.bindPopup(marker.popup);
          }
          m.addTo(mapInstanceRef.current);
          mapRef.current.push(m);
        }
      });
    }
  }, [center, markers]); // Only run when center or markers change

  return (
    <div id="map" style={containerStyle} />
  );
});

export default LocationMap;
