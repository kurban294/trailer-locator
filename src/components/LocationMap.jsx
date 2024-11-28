import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/leaflet.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMap = memo(({ center, isAdjustable = false, onMarkerDrag, onLocationUpdate, onClick }) => {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const isInitializedRef = useRef(false)
  const isDraggingRef = useRef(false)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      const map = L.map('map', {
        center: center || { lat: 51.5074, lng: -0.1278 },
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(map);

      // Add marker at the center
      const marker = L.marker([center.lat, center.lng], {
        draggable: !isAdjustable
      }).addTo(map);
      
      markerRef.current = marker;

      // Handle marker drag in non-adjustable mode
      if (!isAdjustable) {
        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          onMarkerDrag?.({
            lat: pos.lat,
            lng: pos.lng
          });
        });
      }

      // In manual mode, update marker position during map movement
      if (isAdjustable) {
        map.on('movestart', () => {
          isDraggingRef.current = true;
        });

        map.on('move', () => {
          if (!isDraggingRef.current) return;
          const mapCenter = map.getCenter();
          marker.setLatLng(mapCenter);
        });

        map.on('moveend', () => {
          if (!isDraggingRef.current) return;
          isDraggingRef.current = false;
          const mapCenter = map.getCenter();
          onMarkerDrag?.({
            lat: mapCenter.lat,
            lng: mapCenter.lng
          });
        });
      }

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        isInitializedRef.current = false;
        isDraggingRef.current = false;
      }
    };
  }, [isAdjustable, onMarkerDrag]);

  // Update map center when position changes from parent
  useEffect(() => {
    if (!mapRef.current || !center || isDraggingRef.current) return;

    const currentCenter = mapRef.current.getCenter();
    if (currentCenter.lat !== center.lat || currentCenter.lng !== center.lng) {
      mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom(), {
        animate: true,
        duration: 0.5
      });
      
      if (markerRef.current) {
        markerRef.current.setLatLng([center.lat, center.lng]);
      }
    }
  }, [center]);

  // Force map to update its size when container size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      id="map" 
      style={{ 
        height: '100%', 
        width: '100%',
        position: 'relative',
        zIndex: 1
      }} 
    />
  );
});

LocationMap.displayName = 'LocationMap';

export default LocationMap;
