import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import LocationRecorder from '../components/LocationRecorder'
import FindUnit from '../components/FindUnit'
import { debounce } from 'lodash'

const UnitLocation = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [mode, setMode] = useState('search') // 'search', 'record', 'find'

  // Test locations around London
  const testLocations = [
    {
      latitude: 51.5074,
      longitude: -0.1278,
      notes: 'Central London - Test Location 1'
    },
    {
      latitude: 51.5194,
      longitude: -0.1270,
      notes: 'Kings Cross - Test Location 2'
    },
    {
      latitude: 51.5007,
      longitude: -0.1246,
      notes: 'Westminster - Test Location 3'
    }
  ]

  // Function to insert test location data
  const insertTestLocations = async () => {
    try {
      setLoading(true)
      setError(null)

      // First get a unit to test with
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .limit(1)
        .single()

      if (unitsError) throw unitsError
      if (!units) throw new Error('No units found in the database')

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('No authenticated user found')

      console.log('Found unit:', units.id)
      console.log('Current user:', user.id)

      // First set all existing locations for this unit to historical
      const { error: updateError } = await supabase
        .from('location_records')
        .update({ status: 'historical' })
        .eq('unit_id', units.id)
        .eq('status', 'active')

      if (updateError) throw updateError

      // Insert new test locations
      const { data: locations, error: insertError } = await supabase
        .from('location_records')
        .insert(
          testLocations.map(loc => ({
            unit_id: units.id,
            recorded_by: user.id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            notes: loc.notes,
            status: 'active'
          }))
        )
        .select()

      if (insertError) throw insertError

      console.log('Successfully inserted test locations:', locations)
      setError('Test locations inserted successfully')
      
      // If this unit is currently selected, refresh it
      if (selectedUnit?.id === units.id) {
        handleUnitSelect(selectedUnit)
      }
    } catch (error) {
      console.error('Error inserting test locations:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

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
          .ilike('unit_number', `%${query}%`)
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
    // Cancel debounced call on cleanup
    return () => debouncedSearch.cancel()
  }, [searchQuery, debouncedSearch])

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleLocationRecorded = () => {
    setSelectedUnit(null)
    setMode('search')
  }

  const handleClose = () => {
    setSelectedUnit(null)
    setMode('search')
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Unit Location</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setMode('record')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                mode === 'record'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Record Location
            </button>
            <button
              onClick={() => setMode('find')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                mode === 'find'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Find Unit
            </button>
            <button
              onClick={insertTestLocations}
              className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Insert Test Data
            </button>
          </div>
        </div>

        {!selectedUnit ? (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Search for a Unit
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  {mode === 'record'
                    ? 'Enter a unit number to record its location.'
                    : 'Enter a unit number to find its location.'}
                </p>
              </div>
              <div className="mt-5 relative">
                <div className="w-full sm:max-w-xs">
                  <label htmlFor="unit" className="sr-only">
                    Unit Number
                  </label>
                  <input
                    type="text"
                    name="unit"
                    id="unit"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter unit number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {loading && (
                  <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none">
                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}

                {error && (
                  <div className="mt-2 text-sm text-red-600">{error}</div>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full sm:max-w-xs bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {searchResults.map((unit) => (
                      <button
                        key={unit.id}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors duration-150"
                        onClick={() => handleUnitSelect(unit)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {unit.unit_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {unit.unit_type}
                            </div>
                          </div>
                          <span className="text-sm text-blue-600">Select</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !loading && (
                  <div className="absolute z-10 mt-1 w-full sm:max-w-xs bg-white shadow-lg rounded-md py-2 text-base ring-1 ring-black ring-opacity-5 sm:text-sm">
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No units found matching "{searchQuery}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow sm:rounded-lg p-6">
            {mode === 'record' ? (
              <LocationRecorder
                unit={selectedUnit}
                onClose={handleClose}
                onSuccess={handleLocationRecorded}
              />
            ) : (
              <FindUnit
                unit={selectedUnit}
                onClose={handleClose}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UnitLocation
