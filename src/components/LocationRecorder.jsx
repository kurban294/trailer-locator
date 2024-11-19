import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import LocationMap from './LocationMap';
import { 
  MapPinIcon, 
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Uncontrolled notes component using refs
const LocationNotes = memo(() => {
  const textareaRef = useRef(null);

  return (
    <div className="mb-4">
      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
        Notes (optional)
      </label>
      <textarea
        ref={textareaRef}
        id="notes"
        name="notes"
        rows={2}
        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        placeholder="Add any notes about this location..."
      />
    </div>
  );
});

// Memoized map component
const MapSection = memo(({ location, loading, onGetLocation }) => {
  return (
    <div className="relative flex-1">
      <LocationMap
        center={location || { lat: 51.5074, lng: -0.1278 }}
        markers={location ? [{
          position: location,
          popup: 'Current Location'
        }] : []}
      />

      {/* Map Controls */}
      <button
        onClick={onGetLocation}
        className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
        disabled={loading}
      >
        <MapPinIcon className={`h-6 w-6 ${loading ? 'text-gray-400' : 'text-red-500'}`} />
      </button>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4">
            Getting location...
          </div>
        </div>
      )}
    </div>
  );
});

const LocationRecorder = memo(({ unit, onClose }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef(null);

  const getLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy)
        });
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(
          error.code === 1 ? 'Please enable location access' :
          error.code === 2 ? 'Location unavailable' :
          'Failed to get location'
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!location) {
      setError('Please wait for location data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData(formRef.current);
      const notes = formData.get('notes');

      const { error: recordError } = await supabase
        .from('location_records')
        .insert([{
          unit_id: unit.id,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          notes: notes,
          recorded_at: new Date().toISOString()
        }]);

      if (recordError) throw recordError;

      const { error: updateError } = await supabase
        .from('units')
        .update({
          latitude: location.lat,
          longitude: location.lng,
          last_location_update: new Date().toISOString()
        })
        .eq('id', unit.id);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (error) {
      console.error('Error saving location:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [location, unit.id]);

  if (success) {
    return (
      <div className="fixed inset-0 bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-lg font-medium">Location Saved</h3>
          <p className="mt-1 text-sm text-gray-500">
            The location has been successfully recorded
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="text-lg font-medium">Record Location</h2>
          <button onClick={onClose} className="p-1">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Map Area */}
        <MapSection 
          location={location} 
          loading={loading} 
          onGetLocation={getLocation} 
        />

        {/* Bottom Form */}
        <div className="p-4 border-t bg-white">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {location && (
            <div className="mb-4 text-sm text-gray-600">
              Accuracy: ±{location.accuracy} meters
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit}>
            <LocationNotes />
            <button
              type="submit"
              disabled={loading || !location}
              className={`w-full py-2 px-4 rounded-md text-white
                ${loading || !location ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {loading ? 'Saving...' : 'Save Location'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

export default LocationRecorder;
