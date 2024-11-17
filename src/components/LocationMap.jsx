import React, { memo } from 'react';
import { GoogleMap } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const options = {
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
};

const LocationMap = memo(({ position }) => {
  if (!position) return null;

  const onLoad = (map) => {
    const { google } = window;
    if (!google) return;

    const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
      position,
      map,
      title: 'Current Location'
    });
  };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={position}
      zoom={15}
      options={options}
      onLoad={onLoad}
    />
  );
});

LocationMap.displayName = 'LocationMap';

export default LocationMap;
