import React, { useState, useCallback, useEffect, memo } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, ArrowPathIcon, SignalIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import debounce from 'lodash/debounce'
import { useJsApiLoader } from '@react-google-maps/api'
import LocationMap from '../components/LocationMap'

const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278
}

const libraries = ['places', 'marker']

const LocationRecording = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [recentUnits, setRecentUnits] = useState([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [position, setPosition] = useState(defaultCenter)
  const [locationError, setLocationError] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [notes, setNotes] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [watchId, setWatchId] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_GOOGLE_MAPS_MAP_ID]
  })

  // Enhanced geolocation options
  const geoOptions = {
    enableHighAccuracy: true, // Force high accuracy (GPS, etc.)
    timeout: 30000, // Longer timeout for better accuracy
    maximumAge: 0 // Always get fresh location
  };

  const startWatchingLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    // Start watching location
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Only update if accuracy is better than previous
        const newAccuracy = position.coords.accuracy;
        if (!accuracy || newAccuracy < accuracy) {
          setPosition(newPosition);
          setAccuracy(newAccuracy);
        }
        
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError(getLocationErrorMessage(error));
        setLocationLoading(false);
      },
      geoOptions
    );

    setWatchId(id);
  };

  // Start watching location when modal opens
  useEffect(() => {
    if (showLocationModal && isLoaded && !loadError) {
      startWatchingLocation();
    }
    return () => stopWatchingLocation();
  }, [showLocationModal, isLoaded]);

  const stopWatchingLocation = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const getLocationErrorMessage = (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location services.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please try again.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Unable to get your location. Please try again.';
    }
  };

  // Replace getCurrentLocation with new implementation
  const getCurrentLocation = () => {
    stopWatchingLocation(); // Stop current watch
    startWatchingLocation(); // Start new watch
  };

  // Get current location when modal opens
  useEffect(() => {
    if (showLocationModal && isLoaded && !loadError) {
      getCurrentLocation()
    }
  }, [showLocationModal, isLoaded])

  // Load recent units
  useEffect(() => {
    const loadRecentUnits = async () => {
      try {
        const { data: records, error } = await supabase
          .from('location_records')
          .select('unit_id, units(*)')
          .order('recorded_at', { ascending: false })
          .limit(5)

        if (error) throw error

        const uniqueUnits = records
          .map(record => record.units)
          .filter((unit, index, self) => 
            index === self.findIndex(u => u.id === unit.id)
          )
          .slice(0, 3)

        setRecentUnits(uniqueUnits)
      } catch (error) {
        console.error('Error loading recent units:', error)
      }
    }

    loadRecentUnits()
  }, [])

  // Create a debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: searchError } = await supabase
          .from('units')
          .select('*')
          .or(`unit_number.ilike.%${query}%,licence_number.ilike.%${query}%`)
          .order('unit_number')
          .limit(10)

        if (searchError) throw searchError

        setSearchResults(data)
      } catch (error) {
        console.error('Error searching units:', error)
        setError('Failed to search units. Please try again.')
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  // Call debounced search when search query changes
  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => debouncedSearch.cancel()
  }, [searchQuery, debouncedSearch])

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit)
    setShowLocationModal(true)
    setNotes('')
  }

  const handleNotesChange = (e) => {
    e.preventDefault()
    const value = e.target.value
    setNotes(value)
  }

  useEffect(() => {
    if (!showLocationModal) {
      setNotes('')
    }
  }, [showLocationModal])

  const handleLocationUpdate = async () => {
    if (!position) {
      setError('Please wait for location to be determined')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: recordError } = await supabase.rpc('record_unit_location', {
        p_unit_id: selectedUnit.id,
        p_latitude: position.lat,
        p_longitude: position.lng,
        p_notes: notes
      })

      if (recordError) throw recordError

      if (data.success) {
        setIsSuccess(true)
        setTimeout(() => {
          setShowLocationModal(false)
          setIsSuccess(false)
        }, 1500)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error recording location:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationRecorded = () => {
    setSelectedUnit(null)
  }

  // Notes Input Component
  const NotesInput = memo(({ value, onChange }) => {
    return (
      <div className="mt-4">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <div className="mt-1">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Add any additional notes about the location..."
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
    );
  });

  // Location Modal Component
  const LocationModal = memo(({ 
    isLoaded, 
    loadError, 
    showLocationModal, 
    selectedUnit, 
    position, 
    markers, 
    locationLoading, 
    locationError, 
    accuracy,
    notes,
    loading,
    onNotesChange,
    onLocationUpdate,
    onClose,
    getCurrentLocation 
  }) => {
    if (!showLocationModal || !selectedUnit) return null;

    if (loadError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-md bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">Error Loading Map</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Failed to load Google Maps. Please check your internet connection and try again.</p>
            </div>
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center text-center md:items-center">
            <div className="flex w-full transform text-left transition md:my-8 md:max-w-2xl">
              <div className="relative flex w-full flex-col overflow-hidden bg-white">
                {/* Map Section */}
                <div className="relative h-96">
                  <div className="relative h-full">
                    <LocationMap 
                      center={position} 
                      markers={[{ position, popup: 'Current Location' }]}
                    />
                    
                    {/* Location Update Button */}
                    <button
                      onClick={getCurrentLocation}
                      className="absolute top-4 right-4 z-[1000] p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={locationLoading}
                      title="Refresh Location"
                    >
                      <ArrowPathIcon className={`h-6 w-6 ${locationLoading ? 'text-gray-400' : 'text-red-500'} ${locationLoading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Location Accuracy Indicator */}
                    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2">
                      <SignalIcon className={`h-5 w-5 ${
                        accuracy < 10 ? 'text-green-500' : 
                        accuracy < 30 ? 'text-yellow-500' : 
                        'text-red-500'
                      }`} />
                      <span className="text-sm text-gray-700">
                        {locationLoading ? 'Getting location...' : 
                         accuracy ? `Accuracy: ±${Math.round(accuracy)}m` : 
                         'No location data'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Record Location - {selectedUnit.unit_number}
                    </h3>

                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Type:</span> {selectedUnit.unit_type}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Manufacturer:</span> {selectedUnit.manufacturer || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Model:</span> {selectedUnit.model || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">License Number:</span> {selectedUnit.licence_number || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">X Ref Number:</span> {selectedUnit.x_ref_number || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Current Location:</span> {selectedUnit.parking_location || 'Not set'}
                        </p>
                      </div>
                    </div>

                    {locationError && (
                      <div className="mt-4 rounded-md bg-red-50 p-4">
                        <div className="text-sm text-red-700">{locationError}</div>
                      </div>
                    )}

                    <NotesInput 
                      value={notes} 
                      onChange={onNotesChange}
                    />
                  </div>
                </div>

                <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={onLocationUpdate}
                    disabled={loading || !position}
                  >
                    {loading ? 'Saving...' : 'Save Location'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="bg-white shadow">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Record Location</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            {/* Search Bar */}
            <div className="p-4 sm:p-6">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                    placeholder="Search for a unit by number, license, or serial number..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setSearchQuery('')}
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="px-4 sm:px-6 pb-6">
              {loading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 py-4">{error}</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  {searchQuery ? `No units found matching "${searchQuery}"` : 'Start typing to search for units'}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((unit) => (
                    <div
                      key={unit.id}
                      className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-red-500 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 cursor-pointer"
                      onClick={() => handleUnitSelect(unit)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{unit.unit_number}</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {unit.unit_type} • {unit.manufacturer} {unit.model}
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${unit.rag_status === 'RAG 1' ? 'bg-red-100 text-red-800' :
                            unit.rag_status === 'RAG 2' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}`}>
                          {unit.rag_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Recording Modal */}
      <LocationModal 
        isLoaded={isLoaded}
        loadError={loadError}
        showLocationModal={showLocationModal}
        selectedUnit={selectedUnit}
        position={position}
        markers={[{ position, popup: 'Current Location' }]}
        locationLoading={locationLoading}
        locationError={locationError}
        accuracy={accuracy}
        notes={notes}
        loading={loading}
        onNotesChange={(e) => setNotes(e.target.value)}
        onLocationUpdate={handleLocationUpdate}
        onClose={() => setShowLocationModal(false)}
        getCurrentLocation={getCurrentLocation}
      />
    </div>
  )
}

export default LocationRecording
