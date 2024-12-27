import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  SignalIcon,
  MagnifyingGlassIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import debounce from 'lodash/debounce'
import LocationMap from '../components/LocationMap'
import PageHeader from '../components/PageHeader'

const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278
}

export default function LocationRecording({ setShowLocationModal }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [recentUnits, setRecentUnits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [position, setPosition] = useState(defaultCenter)
  const [locationError, setLocationError] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [notes, setNotes] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [watchId, setWatchId] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [isManualLocation, setIsManualLocation] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [locationTimeout, setLocationTimeout] = useState(false)
  const [showRetryOptions, setShowRetryOptions] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [queuedLocations, setQueuedLocations] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const timeoutRef = useRef(null)

  // Update parent component's modal state
  useEffect(() => {
    setShowLocationModal(showModal);
  }, [showModal, setShowLocationModal]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Device is online');
      setIsOnline(true);
      // Process any queued updates when coming back online
      processQueuedUpdates();
    };
    const handleOffline = () => {
      console.log('Device is offline');
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queued updates when coming online
  const processQueuedUpdates = async () => {
    const queuedUpdates = JSON.parse(localStorage.getItem('pendingLocationUpdates') || '[]');
    if (queuedUpdates.length === 0) return;

    setIsSyncing(true);
    try {
      for (const update of queuedUpdates) {
        await saveLocation(update);
      }
      localStorage.setItem('pendingLocationUpdates', '[]');
      // Update the queued locations state
      setQueuedLocations([]);
      setShowQueueDrawer(false);
    } catch (error) {
      console.error('Error processing queued updates:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Enhanced geolocation options
  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0
  };

  const startWatchingLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    setIsManualLocation(false);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    // Clear existing watch
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        console.log('Got GPS position:', position);
        setPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        const currentAccuracy = Math.round(position.coords.accuracy);
        setAccuracy(currentAccuracy);
        setLocationLoading(false);

        // If accuracy is good enough (less than or equal to 10 meters), stop watching
        if (currentAccuracy <= 10) {
          navigator.geolocation.clearWatch(id);
          setWatchId(null);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(
          error.code === 1 ? 'Please enable location access' :
          error.code === 2 ? 'Location not available' :
          'Could not get your location'
        );
        setLocationLoading(false);
      },
      geoOptions
    );

    setWatchId(id);
  };

  const handleMapClick = (e) => {
    console.log('Map clicked:', e);
    setPosition({
      lat: e.lat,
      lng: e.lng
    });
    setAccuracy(10); // Set fixed accuracy for manual locations
    setIsManualLocation(true);
  };

  const handleMarkerDrag = (e) => {
    console.log('Marker dragged:', e);
    setPosition({
      lat: e.lat,
      lng: e.lng
    });
    setAccuracy(10); // Set fixed accuracy for manual locations
    setIsManualLocation(true);
  };

  const saveLocation = async (locationData) => {
    try {
      console.log('Saving location data:', locationData);

      // Validate Supabase connection
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Failed to get current user');
      }

      if (!user) {
        throw new Error('No authenticated user found');
      }

      console.log('Current user:', user);

      // Proceed with insert
      const { data, error } = await supabase
        .from('location_records')
        .insert([{
          unit_id: locationData.unit_id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          notes: locationData.notes || null,
          recorded_by: user.id
        }])
        .select();

      if (error) {
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          status: error.status,
          statusText: error.statusText
        });
        throw new Error(`Database error: ${error.message || 'Unknown error occurred'}`);
      }

      console.log('Location saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Full error object:', error);
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.response) {
        console.error('Error response:', error.response);
      }
      throw error;
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedUnit) {
      setError('Please select a unit first');
      return;
    }

    if (!position) {
      setError('No location data available');
      return;
    }

    if (accuracy > 10 && !isManualLocation) {
      const shouldProceed = window.confirm(
        `GPS accuracy is currently ${accuracy}m which is not optimal.\n\n` +
        'Would you like to:\n' +
        '• Click "Cancel" to set location manually by dragging the map\n' +
        '• Click "OK" to save the current location anyway'
      );
      
      if (!shouldProceed) {
        setIsManualLocation(true);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const locationData = {
        unit_id: selectedUnit.id,
        latitude: position.lat,
        longitude: position.lng,
        notes: notes || null
      };

      if (!isOnline) {
        const queuedUpdates = JSON.parse(localStorage.getItem('pendingLocationUpdates') || '[]');
        queuedUpdates.push(locationData);
        localStorage.setItem('pendingLocationUpdates', JSON.stringify(queuedUpdates));
        setIsSuccess(true);
        // Show success message for 2 seconds before closing
        setTimeout(() => {
          setShowModal(false);
          setIsSuccess(false);
          setSelectedUnit(null);
          setNotes('');
        }, 2000);
      } else {
        await saveLocation(locationData);
        setIsSuccess(true);
        // Show success message for 2 seconds before closing
        setTimeout(() => {
          setShowModal(false);
          setIsSuccess(false);
          setSelectedUnit(null);
          setNotes('');
        }, 2000);
      }
    } catch (error) {
      console.error('Save location error:', error);
      setError(error.message || 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start watching location when modal opens
  useEffect(() => {
    if (showModal) {
      startWatchingLocation();
    }
    return () => stopWatchingLocation();
  }, [showModal]);

  const stopWatchingLocation = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Clear location watching on unmount
  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, [stopWatchingLocation]);

  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true)
    setLocationError(null)
    setLocationTimeout(false)
    setIsManualLocation(false)
    setShowRetryOptions(false)

    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
          return;
        }

        // Set timeout for GPS coordinates
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Location request timed out'));
        }, 15000); // 15 seconds timeout

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutRef.current);
            resolve(position);
          },
          (error) => {
            clearTimeout(timeoutRef.current);
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      setPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
      setAccuracy(position.coords.accuracy)
    } catch (error) {
      console.error('Error getting location:', error)
      if (error.message === 'Location request timed out') {
        setLocationTimeout(true)
      } else {
        setLocationError(error.message)
      }
    } finally {
      setLocationLoading(false)
    }
  }, [])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getAccuracyIndicator = (accuracy) => {
    if (!accuracy) return null;

    let color, label;
    if (accuracy <= 5) {
      color = 'text-green-500';
      label = 'Good';
    } else if (accuracy <= 10) {
      color = 'text-yellow-500';
      label = 'Medium';
    } else {
      color = 'text-red-500';
      label = 'Poor';
    }

    return (
      <div className={`flex items-center ${color}`}>
        <SignalIcon className="h-5 w-5 mr-1" />
        <span className="text-sm font-medium">GPS Accuracy: {label} ({accuracy}m)</span>
      </div>
    );
  };

  const LocationAccuracyIndicator = ({ accuracy }) => {
    const accuracyIndicator = getAccuracyIndicator(accuracy);

    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col space-y-4">
          {locationTimeout ? (
            <div className="flex items-center text-red-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">
                GPS location request timed out
              </span>
            </div>
          ) : accuracyIndicator ? (
            accuracyIndicator
          ) : null}

          {((accuracy > 5 && !isManualLocation) || showRetryOptions) && (
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => {
                  getCurrentLocation();
                  setShowRetryOptions(false);
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Retry GPS
              </button>
              <button
                type="button"
                onClick={() => {
                  stopWatchingLocation();
                  setIsManualLocation(true);
                  setLocationError(null);
                  setLocationTimeout(false);
                  setShowRetryOptions(false);
                  setLocationLoading(false);
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <MapPinIcon className="h-5 w-5 mr-2" />
                Select Manually
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Location Error Display Component
  const LocationError = () => {
    if (!locationError || locationTimeout) return null;

    return (
      <div className="mb-4 p-4 bg-red-50 rounded-lg">
        <div className="flex items-center mb-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700 font-medium">Location Error</span>
        </div>
        <p className="text-red-600 text-sm mb-4">{locationError}</p>
        
        <button
          type="button"
          onClick={getCurrentLocation}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Retry
        </button>
      </div>
    );
  };

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
          setShowModal(false)
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

  const NotesModal = memo(() => {
    const [tempNotes, setTempNotes] = useState(notes);

    const handleSaveNotes = () => {
      setNotes(tempNotes);
      setShowNotesModal(false);
    };

    if (!showNotesModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[70]">
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full mx-4 sm:my-8 sm:max-w-lg sm:h-auto sm:rounded-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                {/* Close button - moved outside of content area */}
                <div className="absolute right-0 top-0 pr-4 pt-4 z-10">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={() => setShowNotesModal(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Content area with more padding */}
                <div className="mt-3 text-left">
                  <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-4 pt-2">
                    Add Notes
                  </h3>
                  <div className="mt-4">
                    <textarea
                      rows={6}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base"
                      placeholder="Add any additional notes about this location..."
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons with more padding and full width on mobile */}
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-3 text-base font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                  onClick={handleSaveNotes}
                >
                  Save Notes
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-3 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowNotesModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  const SuccessModal = memo(() => {
    const [queueCount, setQueueCount] = useState(0);

    useEffect(() => {
      if (!isOnline) {
        const queue = JSON.parse(localStorage.getItem('pendingLocationUpdates') || '[]');
        setQueueCount(queue.length);
      }
    }, [isOnline]);

    if (!isSuccess) return null;

    return (
      <div className="fixed inset-0 bg-green-50 bg-opacity-90 transition-opacity z-[80] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4 w-full transform transition-all">
          <div className="flex flex-col items-center text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isOnline ? 'Location Saved Successfully!' : 'Location Queued Successfully!'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {isOnline ? (
                  'The location has been recorded and saved to the database.'
                ) : (
                  <>
                    <span className="font-medium text-amber-600">You're currently offline.</span>
                    <br />
                    This location has been added to the queue
                    {queueCount > 0 && ` (${queueCount} ${queueCount === 1 ? 'location' : 'locations'} pending)`}
                    <br />
                    and will sync automatically when you're back online.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  });

  const LocationModal = memo(() => {
    if (!showModal) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden bg-white text-left shadow-xl transition-all w-full h-full sm:my-8 sm:w-full sm:max-w-lg sm:h-auto sm:rounded-lg">
              <div className="flex flex-col h-full">
                {/* Close button */}
                <div className="absolute right-0 top-0 pr-4 pt-4 block z-[60]">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={() => setShowModal(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 pb-4 pt-5 sm:p-6">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                      Record Location
                    </h3>

                    {/* Unit Details */}
                    {selectedUnit && (
                      <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Unit Number</p>
                            <p className="text-sm text-gray-900">{selectedUnit.unit_number}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">X Ref Number</p>
                            <p className="text-sm text-gray-900">{selectedUnit.x_ref_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Licence Number</p>
                            <p className="text-sm text-gray-900">{selectedUnit.licence_number}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Unit Type</p>
                            <p className="text-sm text-gray-900">{selectedUnit.unit_type}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Messages */}
                    <div className="mb-4">
                      {!isOnline && (
                        <div className="flex items-center text-yellow-600 mb-2">
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">You are currently offline. Location will be saved when you're back online.</span>
                        </div>
                      )}
                      {isSuccess && (
                        <div className="flex items-center text-green-600 mb-2">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">Location saved successfully!</span>
                        </div>
                      )}
                      {error && (
                        <div className="flex items-center text-red-600 mb-2">
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">{error}</span>
                        </div>
                      )}
                    </div>

                    {/* Location Error */}
                    <LocationError />

                    {/* Accuracy Indicator */}
                    {accuracy && !locationError && <LocationAccuracyIndicator accuracy={accuracy} />}

                    {/* Map Container */}
                    <div className="mb-4 relative rounded-lg overflow-hidden border border-gray-300" style={{ height: '400px' }}>
                      <LocationMap
                        center={position}
                        isAdjustable={isManualLocation}
                        onMarkerDrag={useCallback((newPosition) => {
                          if (isManualLocation) {
                            setPosition(newPosition);
                          }
                        }, [isManualLocation])}
                      />
                      {locationLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-[55]">
                          <ArrowPathIcon className="h-8 w-8 text-gray-600 animate-spin" />
                        </div>
                      )}
                      {isManualLocation && (
                        <>
                          <div className="absolute top-4 left-4 right-16 bg-white bg-opacity-90 p-2 rounded-lg shadow text-sm text-gray-600 z-[55]">
                            Move the map to position the marker at your desired location
                          </div>
                          <button
                            onClick={() => {
                              stopWatchingLocation();
                              setIsManualLocation(false);
                              setShowRetryOptions(true);
                              setLocationLoading(false);
                            }}
                            className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md z-[55] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Exit Manual Mode"
                          >
                            <XMarkIcon className="h-6 w-6 text-gray-600" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Notes Button */}
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setShowNotesModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        {notes ? 'Edit Notes' : 'Add Notes'}
                        {notes && <span className="ml-2 text-xs text-gray-500">(Notes added)</span>}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Save Button */}
                <div className="sticky bottom-0 left-0 right-0 px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <button
                    type="button"
                    className={`w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
                    }`}
                    onClick={handleSaveLocation}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin inline" />
                        Saving...
                      </>
                    ) : (
                      'Save Location'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Get current location when modal opens
  useEffect(() => {
    if (showModal) {
      getCurrentLocation()
    }
  }, [showModal])

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
    setShowModal(true)
    setNotes('')
  }

  useEffect(() => {
    if (!showModal) {
      setNotes('')
    }
  }, [showModal])

  // Update queued locations count
  useEffect(() => {
    const updateQueueCount = () => {
      const queue = JSON.parse(localStorage.getItem('pendingLocationUpdates') || '[]');
      setQueuedLocations(queue);
    };

    // Update initially and when localStorage changes
    updateQueueCount();
    window.addEventListener('storage', updateQueueCount);

    return () => {
      window.removeEventListener('storage', updateQueueCount);
    };
  }, []);

  const QueueDrawer = memo(() => {
    const [unitDetails, setUnitDetails] = useState({});

    // Fetch unit details when drawer opens
    useEffect(() => {
      const fetchUnitDetails = async () => {
        if (!showQueueDrawer || queuedLocations.length === 0) return;

        try {
          const unitIds = [...new Set(queuedLocations.map(loc => loc.unit_id))];
          const { data, error } = await supabase
            .from('units')
            .select('id, unit_number')
            .in('id', unitIds);

          if (error) throw error;

          const detailsMap = {};
          data.forEach(unit => {
            detailsMap[unit.id] = unit;
          });
          setUnitDetails(detailsMap);
        } catch (error) {
          console.error('Error fetching unit details:', error);
        }
      };

      fetchUnitDetails();
    }, [showQueueDrawer, queuedLocations]);

    if (!showQueueDrawer) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[90]">
        <div className="fixed inset-y-0 right-0 flex max-w-full">
          <div className="w-screen max-w-md transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Pending Locations ({queuedLocations.length})
                  </h2>
                  <div className="ml-3 flex h-7 items-center">
                    <button
                      type="button"
                      className="relative -m-2 p-2 text-gray-400 hover:text-gray-500"
                      onClick={() => setShowQueueDrawer(false)}
                    >
                      <span className="absolute -inset-0.5" />
                      <span className="sr-only">Close panel</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flow-root">
                    <ul role="list" className="-my-6 divide-y divide-gray-200">
                      {queuedLocations.map((location, index) => (
                        <li key={index} className="flex py-6">
                          <div className="ml-4 flex flex-1 flex-col">
                            <div className="flex justify-between text-base font-medium text-gray-900">
                              <h3>Unit {unitDetails[location.unit_id]?.unit_number || '...'}</h3>
                              {isOnline && (
                                <div className="flex items-center text-sm text-amber-600">
                                  <CloudArrowUpIcon className="h-5 w-5 mr-1" />
                                  Waiting to sync
                                </div>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </div>
                            {location.notes && (
                              <p className="mt-1 text-sm text-gray-500">
                                Notes: {location.notes}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {isOnline && (
                <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className={`flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                        isSyncing 
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-500'
                      }`}
                      onClick={processQueuedUpdates}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <ArrowPathIcon className="h-5 w-5 mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="h-5 w-5 mr-1" />
                          Sync Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Record Location" 
        subtitle="Record the current location of a unit"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-6">
          {queuedLocations.length > 0 && (
            <button
              onClick={() => setShowQueueDrawer(true)}
              className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-200"
            >
              <CloudArrowUpIcon className="h-5 w-5 mr-1" />
              {queuedLocations.length} Pending
            </button>
          )}
        </div>
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
              <div className="mt-4">
                <ul role="list" className="divide-y divide-gray-200">
                  {searchResults.map((unit) => (
                    <li key={unit.id}>
                      <button
                        onClick={() => handleUnitSelect(unit)}
                        className="w-full text-left hover:bg-gray-50 block"
                      >
                        <div className="px-4 py-4 sm:px-6">
                          {/* Mobile View */}
                          <div className="md:hidden">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <h3 className="text-base font-medium text-gray-900">
                                  {unit.unit_number}
                                </h3>
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600">
                                    License: {unit.licence_number || 'N/A'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    X-Ref: {unit.x_ref_number || 'N/A'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Type: {unit.unit_type || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Desktop View */}
                          <div className="hidden md:block">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="grid grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-sm text-gray-500">Unit Number</p>
                                    <p className="text-sm font-medium text-gray-900">{unit.unit_number}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">License Number</p>
                                    <p className="text-sm font-medium text-gray-900">{unit.licence_number || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">X-Ref Number</p>
                                    <p className="text-sm font-medium text-gray-900">{unit.x_ref_number || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Unit Type</p>
                                    <p className="text-sm font-medium text-gray-900">{unit.unit_type || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Recording Modal */}
      {showModal && <LocationModal />}
      {/* Notes Modal */}
      {showNotesModal && <NotesModal />}
      {/* Success Modal */}
      {isSuccess && <SuccessModal />}
      {/* Queue Drawer */}
      <QueueDrawer />
    </div>
  )
}
