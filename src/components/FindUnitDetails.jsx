import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import LocationMap from './LocationMap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  MapPinIcon, 
  QrCodeIcon, 
  ClockIcon, 
  XMarkIcon, 
  PrinterIcon,
  UserCircleIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';

const Modal = ({ children, onClose }) => {
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {children}
      </div>
    </div>,
    document.body
  );
};

const FindUnitDetails = () => {
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', '7days', '30days', 'custom'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [mapCenter, setMapCenter] = useState(null);

  const mapRef = useRef(null);
  const historyRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (unit?.latitude && unit?.longitude) {
      const lat = parseFloat(unit.latitude);
      const lng = parseFloat(unit.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter({ lat, lng });
        setMarkers([{
          position: { lat, lng },
          popup: `
            <div class="text-sm">
              <div class="font-medium mb-1">Current Location</div>
              <div class="text-gray-600">
                Unit: ${unit.unit_number}<br>
                Last Updated: ${formatDate(unit.updated_at)}
              </div>
            </div>
          `
        }]);
      }
    }
  }, [unit]);

  useEffect(() => {
    if (!locationHistory.length) {
      setFilteredHistory([]);
      return;
    }

    let filtered = locationHistory;
    if (!locationHistory) return;

    switch (dateFilter) {
      case 'today':
        if (startDate && endDate) {
          filtered = locationHistory.filter(location => {
            const date = new Date(location.recorded_at);
            return date >= startDate && date <= endDate;
          });
        }
        break;

      case '7days':
        if (startDate && endDate) {
          filtered = locationHistory.filter(location => {
            const date = new Date(location.recorded_at);
            return date >= startDate && date <= endDate;
          });
        }
        break;

      case '30days':
        if (startDate && endDate) {
          filtered = locationHistory.filter(location => {
            const date = new Date(location.recorded_at);
            return date >= startDate && date <= endDate;
          });
        }
        break;

      case 'custom':
        if (startDate && endDate) {
          filtered = locationHistory.filter(location => {
            const date = new Date(location.recorded_at);
            return date >= startDate && date <= endDate;
          });
        }
        break;

      case 'all':
      default:
        filtered = locationHistory;
        break;
    }

    setFilteredHistory(filtered || []);
  }, [locationHistory, dateFilter, startDate, endDate]);

  useEffect(() => {
    if (showHistory && historyRef.current) {
      setTimeout(() => {
        historyRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [showHistory]);

  const handleFilterClick = (filterType) => {
    switch (filterType) {
      case 'all':
        setDateFilter('all');
        setStartDate(null);
        setEndDate(null);
        break;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setDateFilter('today');
        setStartDate(today);
        setEndDate(new Date());
        break;
      case '7days':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        setDateFilter('7days');
        setStartDate(sevenDaysAgo);
        setEndDate(new Date());
        break;
      case '30days':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        setDateFilter('30days');
        setStartDate(thirtyDaysAgo);
        setEndDate(new Date());
        break;
    }
    setShowDatePicker(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the unit details
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();

      if (unitError) throw unitError;

      // Then get the location records
      const { data: locationData, error: locationError } = await supabase
        .from('location_records')
        .select(`
          id,
          unit_id,
          latitude,
          longitude,
          recorded_at,
          recorded_by,
          notes,
          status
        `)
        .eq('unit_id', id)
        .order('recorded_at', { ascending: false });

      if (locationError) throw locationError;

      // Fetch user profiles for all recorded_by users
      const uniqueUserIds = [...new Set(locationData.map(loc => loc.recorded_by))].filter(Boolean);
      
      let userProfiles = {};
      if (uniqueUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', uniqueUserIds);

        if (profilesError) throw profilesError;

        userProfiles = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      // Merge location data with user profiles
      const enrichedLocationData = locationData.map(location => ({
        ...location,
        user_profile: location.recorded_by ? userProfiles[location.recorded_by] : null
      }));

      console.log('Raw unit data:', unitData);
      console.log('Enriched location records:', enrichedLocationData);

      // Update unit with latest location if available
      if (enrichedLocationData && enrichedLocationData.length > 0) {
        const latestLocation = enrichedLocationData[0];
        console.log('Latest location record:', latestLocation);

        // Check if we have valid coordinates
        const hasValidCoordinates = 
          latestLocation.latitude != null && 
          latestLocation.longitude != null &&
          !isNaN(parseFloat(latestLocation.latitude)) && 
          !isNaN(parseFloat(latestLocation.longitude));

        console.log('Has valid coordinates:', hasValidCoordinates);

        if (hasValidCoordinates) {
          const latitude = parseFloat(latestLocation.latitude);
          const longitude = parseFloat(latestLocation.longitude);
          
          console.log('Parsed coordinates:', { latitude, longitude });
          
          setUnit({
            ...unitData,
            latitude,
            longitude
          });
        } else {
          console.warn('Invalid location data:', latestLocation);
          setUnit(unitData);
        }
      } else {
        setUnit(unitData);
      }

      setLocationHistory(enrichedLocationData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading unit details:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleOpenInGoogleMaps = () => {
    if (unit?.latitude && unit?.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`,
        '_blank'
      );
    }
  };

  const handlePrintQRCode = () => {
    const printWindow = window.open('', '_blank');
    const qrCodeUrl = `https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`;
    
    // Format the date safely
    let dateString = 'Not available';
    try {
      if (unit.updated_at) {
        const date = new Date(unit.updated_at);
        if (!isNaN(date.getTime())) {
          dateString = format(date, 'MMM d, yyyy h:mm a');
        }
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Unit ${unit.unit_number}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .unit-info {
              margin-bottom: 20px;
              font-size: 24px;
              font-weight: bold;
              color: #1a1a1a;
            }
            .unit-type {
              margin-bottom: 20px;
              font-size: 16px;
              color: #4b5563;
            }
            .location-info {
              margin-top: 15px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              body {
                min-height: auto;
              }
              .qr-container {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="unit-info">Unit ${unit.unit_number}</div>
            <div class="unit-type">${unit.unit_type || 'Type not specified'}</div>
            <div style="margin: 20px 0;">
              ${ReactDOMServer.renderToString(
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
            <div class="location-info">
              Scan to view location on Google Maps<br>
              Last updated: ${dateString}
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const handleViewLocation = (location) => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter({ lat, lng });
      setMarkers([{
        position: { lat, lng },
        popup: `
          <div class="text-sm">
            <div class="font-medium mb-1">Location Update</div>
            <div class="text-gray-600">
              Unit: ${unit.unit_number}<br>
              Updated: ${formatDate(location.recorded_at)}<br>
              ${location.notes ? `Notes: ${location.notes}` : ''}
            </div>
          </div>
        `
      }]);
    }
  };

  const defaultCenter = useMemo(() => ({ lat: 51.5074, lng: -0.1278 }), []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          Error loading unit details: {error}
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md">
          Unit not found
        </div>
      </div>
    );
  }

  const currentLocation = locationHistory && locationHistory.length > 0 ? locationHistory[0] : null;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLocation?.latitude},${currentLocation?.longitude}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/find-unit')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          &larr; Back to Units
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Unit {unit?.unit_number}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Last updated: {currentLocation ? formatDate(currentLocation.recorded_at) : 'Not available'}
              </p>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-3xl mx-auto">
                <button
                  onClick={handleOpenInGoogleMaps}
                  disabled={!unit?.latitude || !unit?.longitude}
                  className={`flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                    unit?.latitude && unit?.longitude
                      ? 'text-white bg-red-600 hover:bg-red-700 border-transparent'
                      : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  Open in Maps
                </button>
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  QR Code
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Location History
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
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
                      <dt className="text-sm font-medium text-gray-500">Unit Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">{unit.unit_status || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">X-Ref Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{unit.x_ref_number || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {currentLocation && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Last Known Location Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Recorded At</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(currentLocation.recorded_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Recorded By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentLocation.user_profile ? 
                        `${currentLocation.user_profile.first_name} ${currentLocation.user_profile.last_name}` : 
                        'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentLocation.notes || 'No notes'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">View in Maps</dt>
                    <dd className="mt-1">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Open in Google Maps
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className="mt-6 h-96 map-container relative z-0">
            <LocationMap 
              center={mapCenter || defaultCenter}
              markers={markers}
            />
          </div>

          {showQRCode && (
            <Modal onClose={() => setShowQRCode(false)}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  QR Code - Unit {unit.unit_number}
                </h3>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4">
                <QRCodeSVG
                  value={`https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Scan this QR code to view the unit's location on Google Maps
                </p>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handlePrintQRCode}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print QR Code
                </button>
              </div>
            </Modal>
          )}

          {showHistory && (
            <div ref={historyRef} className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden scroll-mt-6">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Location History</h2>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    Filter by Date
                  </button>
                </div>

                {/* Timeline */}
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {filteredHistory.map((location, locationIdx) => (
                      <li key={location.id}>
                        <div className="relative pb-8">
                          {locationIdx !== filteredHistory.length - 1 ? (
                            <span
                              className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 ring-8 ring-white">
                                <MapPinIcon className="h-5 w-5 text-red-600" aria-hidden="true" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    Location Updated
                                  </div>
                                  <button
                                    onClick={() => handleViewLocation(location)}
                                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 rounded-full"
                                  >
                                    View on Map
                                  </button>
                                </div>
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <UserCircleIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                    {location.user_profile ? 
                                      `${location.user_profile.first_name} ${location.user_profile.last_name}` : 
                                      'Unknown'}
                                  </div>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <CalendarIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                    {formatDate(location.recorded_at)}
                                  </div>
                                  {location.notes && (
                                    <div className="flex items-start text-sm text-gray-500">
                                      <ChatBubbleLeftIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400 mt-0.5" />
                                      <span className="whitespace-pre-wrap">{location.notes}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center text-sm text-gray-500">
                                    <MapPinIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                    {`${location.latitude}, ${location.longitude}`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {filteredHistory.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No location history available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindUnitDetails;
