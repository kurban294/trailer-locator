import React, { useState, useCallback, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  ChevronUpIcon, 
  CheckCircleIcon,
  SignalIcon
} from '@heroicons/react/24/outline'

const defaultCenter = {
  lat: 51.5074, // London
  lng: -0.1278
}

const libraries = ['places']

const LocationRecorder = ({ unit, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [position, setPosition] = useState(null)
  const [notes, setNotes] = useState('')
  const [map, setMap] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)

  // Load Google Maps API with useJsApiLoader hook
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  // Get current location when component mounts
  useEffect(() => {
    if (isLoaded && !loadError) {
      getCurrentLocation()
    }
  }, [isLoaded])

  const getCurrentLocation = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setPosition(newPosition)
        setAccuracy(position.coords.accuracy)
        if (map) {
          map.panTo(newPosition)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        setLocationError('Unable to get your current location. Please ensure location services are enabled.')
        setPosition(defaultCenter)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const onLoad = useCallback((map) => {
    const bounds = new window.google.maps.LatLngBounds()
    if (position) {
      bounds.extend(position)
    }
    map.fitBounds(bounds)
    setMap(map)
  }, [position])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!position) {
      setError('Please wait for location to be determined')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: recordError } = await supabase.rpc('record_unit_location', {
        p_unit_id: unit.id,
        p_latitude: position.lat,
        p_longitude: position.lng,
        p_notes: notes
      })

      if (recordError) throw recordError

      if (data.success) {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess?.(data)
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

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Map</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Failed to load Google Maps. Please check your internet connection and try again.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Location Recorded</h3>
          <p className="mt-1 text-sm text-gray-500">
            The location has been successfully recorded.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 inset-x-0 bg-white shadow-sm z-20">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-gray-700"
          >
            <ArrowLeftIcon className="h-6 w-6 mr-2" />
            Back
          </button>
          <h1 className="text-lg font-medium text-gray-900">
            {unit.unit_number}
          </h1>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 0h-4m4 12v4h-4M4 12v8h4" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Map */}
      <div className={`${isFullscreen ? 'fixed inset-0 z-10' : 'h-[60vh] mt-14'}`}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={position || defaultCenter}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {position && <Marker position={position} />}
        </GoogleMap>

        {/* Refresh Location Button */}
        <button
          type="button"
          onClick={getCurrentLocation}
          className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg"
        >
          <MapPinIcon className="h-6 w-6 text-blue-600" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <div className={`fixed inset-x-0 bottom-0 transform ${
        showBottomSheet ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'
      } transition-transform duration-300 ease-in-out bg-white rounded-t-xl shadow-lg z-30`}>
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowBottomSheet(!showBottomSheet)}
              className="flex items-center text-gray-700"
            >
              <span className="text-sm font-medium">
                {showBottomSheet ? 'Hide Details' : 'Show Details'}
              </span>
              <ChevronUpIcon className={`h-5 w-5 transform ${
                showBottomSheet ? 'rotate-180' : ''
              } transition-transform duration-300 ml-2`} />
            </button>
            
            {/* Location Accuracy Indicator */}
            {accuracy && (
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full">
                <SignalIcon className={`h-5 w-5 ${
                  accuracy < 10 ? 'text-green-500' :
                  accuracy < 30 ? 'text-yellow-500' :
                  'text-red-500'
                }`} />
                <span className="text-sm">
                  <span className="font-medium">Accuracy:</span> ±{Math.round(accuracy)}m
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Location Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-700">Current Location</h3>
            {position && (
              <p className="mt-1 text-sm text-gray-500">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Notes Field */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Add any relevant notes about this location..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !position}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading || !position
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Recording...
              </div>
            ) : (
              'Record Location'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationRecorder
