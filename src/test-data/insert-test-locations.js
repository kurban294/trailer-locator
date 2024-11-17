import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = 'https://xtpqjzwpjxjsxlqhzqyv.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

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

// Function to insert test location records
async function insertTestLocations() {
  try {
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
    return { success: true, data: locations }
  } catch (error) {
    console.error('Error inserting test locations:', error)
    return { success: false, error }
  }
}

// Execute the function
insertTestLocations()
