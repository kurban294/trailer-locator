import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPinIcon, QrCodeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import LocationMap from './LocationMap';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

const FindUnit = () => {
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      fetchUnitDetails(id);
    }
  }, [id]);

  const fetchUnitDetails = async (unitId) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single();

      if (error) throw error;

      setUnit(data);
      fetchLocationHistory(data.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unit?.id) {
      fetchLocationHistory(unit.id);
    }
  }, [unit?.id]);

  const fetchLocationHistory = async (unitId) => {
    try {
      setLoading(true);
      console.log('Fetching location history for unit:', unitId);
      
      // First get the location records
      const { data: locations, error: locationError } = await supabase
        .from('location_records')
        .select(`
          id,
          unit_id,
          latitude,
          longitude,
          notes,
          status,
          recorded_at,
          recorded_by
        `)
        .eq('unit_id', unitId)
        .order('recorded_at', { ascending: false });

      if (locationError) throw locationError;

      if (locations && locations.length > 0) {
        // Then get the user profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', locations.map(loc => loc.recorded_by));

        if (profileError) throw profileError;

        // Combine the data
        const locationsWithUsers = locations.map(location => ({
          ...location,
          recorded_by: profiles?.find(profile => profile.id === location.recorded_by) || null
        }));

        console.log('Locations with users:', locationsWithUsers);
        setLocationHistory(locationsWithUsers);
      } else {
        setLocationHistory([]);
      }
    } catch (error) {
      console.error('Error fetching location history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!unit) return null;

  // Get the most recent active location
  const currentLocation = locationHistory.find(loc => loc.status === 'active') || locationHistory[0];
  console.log('Current location:', currentLocation); // Debug log

  const position = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : null;

  console.log('Map position:', position); // Debug log

  const qrValue = `${window.location.origin}/unit/${unit.id}`;

  const handleOpenInGoogleMaps = () => {
    if (currentLocation) {
      const url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      window.open(url, '_blank');
    }
  };

  const googleMapsUrl = currentLocation
    ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
    : '';

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Location Data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <MapPinIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">No Location Data</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>This unit's location has not been recorded yet.</p>
              <p className="mt-1">Unit ID: {unit.id}</p>
              <p className="mt-1">Location History Length: {locationHistory.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unit Details Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Unit Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.unit_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Unit Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.unit_type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">License Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.licence_number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.serial_number || 'N/A'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Location</h3>
              <p className="text-sm text-gray-500 mb-2">
                Last updated: {formatDate(currentLocation.recorded_at)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenInGoogleMaps}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  Open in Google Maps
                </button>
                <button
                  type="button"
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  {showHistory ? 'Hide History' : 'View History'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <LocationMap
        center={position}
        zoom={15}
        style={{ height: '400px', width: '100%' }}
      >
        <Marker position={position}>
          <Popup>
            <div className="text-center">
              <strong>{unit.unit_number}</strong>
              <br />
              Last updated: {formatDate(currentLocation.recorded_at)}
              {currentLocation.notes && (
                <>
                  <br />
                  <em>{currentLocation.notes}</em>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      </LocationMap>

      {/* QR Code Section */}
      {showQRCode && googleMapsUrl && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-6">
          <div className="flex items-start space-x-6">
            <QRCodeSVG value={googleMapsUrl} size={128} />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Mobile Access</h3>
              <p className="mt-2 text-sm text-gray-500">
                Scan this QR code with your mobile device to open the location in Google Maps.
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location History Section */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location History</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : locationHistory.length > 0 ? (
              <div className="flow-root">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Location
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Recorded By
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {locationHistory.map((location) => (
                      <tr key={location.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                          {formatDate(location.recorded_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View on Map
                          </a>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            location.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {location.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {location.recorded_by
                            ? `${location.recorded_by.first_name} ${location.recorded_by.last_name}`
                            : 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {location.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No location history available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FindUnit;
