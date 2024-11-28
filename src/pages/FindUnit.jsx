import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { debounce } from 'lodash'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader'
import FindUnitDetails from '../components/FindUnit'
import { format, formatDistanceToNow } from 'date-fns'

export default function FindUnit() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [searchResults, setSearchResults] = useState([])

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        // First get the units
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .ilike('unit_number', `%${query}%`)
          .order('unit_number')
          .limit(10)

        if (unitsError) throw unitsError

        // Then fetch the latest location record and user info for each unit
        const unitsWithLocation = await Promise.all(unitsData.map(async (unit) => {
          // Get the latest location record
          const { data: locationData, error: locationError } = await supabase
            .from('location_records')
            .select('*')
            .eq('unit_id', unit.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single()

          if (locationError && locationError.code !== 'PGRST116') {
            console.error('Error fetching location:', locationError)
          }

          let userData = null
          if (locationData?.recorded_by) {
            // Get the user profile data
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', locationData.recorded_by)
              .single()

            if (profileError) {
              console.error('Error fetching user profile:', profileError)
            } else {
              userData = profileData
            }
          }

          return {
            ...unit,
            latest_location: locationData || null,
            recorded_by: userData,
            updated_at: locationData?.recorded_at || null
          }
        }))

        setSearchResults(unitsWithLocation)
      } catch (error) {
        console.error('Error searching units:', error)
        setError('Failed to search units. Please try again.')
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => debouncedSearch.cancel()
  }, [searchQuery, debouncedSearch])

  const handleUnitSelect = async (unit) => {
    try {
      setLoading(true)
      // Fetch the latest location record for the unit
      const { data: locationData, error: locationError } = await supabase
        .from('location_records')
        .select(`
          *,
          recorded_by:profiles!location_records_recorded_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('unit_id', unit.id)
        .eq('status', 'active')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      if (locationError && locationError.code !== 'PGRST116') throw locationError

      // Combine unit data with location data
      const unitWithLocation = {
        ...unit,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
        location_notes: locationData?.notes,
        updated_at: locationData?.recorded_at,
        updated_by: locationData?.recorded_by
      }

      setSelectedUnit(unitWithLocation)
      setSearchResults([])
      setSearchQuery('')
    } catch (error) {
      console.error('Error fetching unit location:', error)
      // Still show the unit even if location fetch fails
      setSelectedUnit(unit)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedUnit(null)
    setSearchQuery('')
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'amber':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredUnits = searchResults.filter(unit => {
    const searchLower = searchQuery.toLowerCase()
    return (
      unit.unit_number?.toLowerCase().includes(searchLower) ||
      unit.licence_number?.toLowerCase().includes(searchLower) ||
      unit.location?.toLowerCase().includes(searchLower) ||
      unit.rag_status?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Find Unit" 
        description="Search and locate trailer units"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedUnit ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    placeholder="Enter unit number (e.g., TR-1234)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {loading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {filteredUnits.map((unit) => (
                        <li key={unit.id}>
                          <Link to={`/unit/${unit.id}`} className="block hover:bg-gray-50">
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
                                      <p className="text-sm text-gray-600">
                                        Last Update: {unit.latest_location ? format(new Date(unit.latest_location.recorded_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Recorded By: {unit.recorded_by ? `${unit.recorded_by.first_name} ${unit.recorded_by.last_name}` : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Desktop View */}
                              <div className="hidden md:block">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="grid grid-cols-6 gap-4">
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
                                      <div>
                                        <p className="text-sm text-gray-500">Last Update</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {unit.latest_location ? format(new Date(unit.latest_location.recorded_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-500">Recorded By</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {unit.recorded_by ? `${unit.recorded_by.first_name} ${unit.recorded_by.last_name}` : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                      {filteredUnits.length === 0 && (
                        <li className="py-8">
                          <div className="text-center">
                            <p className="text-gray-500">No units found matching your search.</p>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !loading && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No units found matching "{searchQuery}"</p>
                    <p className="mt-2 text-sm text-gray-400">Try searching with a different unit number</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleClose}
              className="mb-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Back to Search
            </button>
            <FindUnitDetails unit={selectedUnit} onClose={handleClose} />
          </div>
        )}
      </div>
    </div>
  )
}
