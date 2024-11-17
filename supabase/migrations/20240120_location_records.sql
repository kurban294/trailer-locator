-- Create an enum for location status
CREATE TYPE location_status AS ENUM ('active', 'historical');

-- Create the location_records table
CREATE TABLE location_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID REFERENCES units(id) NOT NULL,
    recorded_by UUID REFERENCES auth.users(id) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    notes TEXT,
    status location_status DEFAULT 'active',
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE location_records ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all location records
CREATE POLICY "Users can view all location records"
    ON location_records
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert location records
CREATE POLICY "Users can insert location records"
    ON location_records
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_location_records_updated_at
    BEFORE UPDATE ON location_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX location_records_unit_id_idx ON location_records(unit_id);
CREATE INDEX location_records_recorded_at_idx ON location_records(recorded_at);

-- Function to record a new location
CREATE OR REPLACE FUNCTION record_unit_location(
    p_unit_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unit units%ROWTYPE;
    v_location_record location_records%ROWTYPE;
BEGIN
    -- Check if unit exists
    SELECT * INTO v_unit
    FROM units
    WHERE id = p_unit_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unit not found'
        );
    END IF;

    -- Set previous location records for this unit to historical
    UPDATE location_records
    SET status = 'historical'
    WHERE unit_id = p_unit_id AND status = 'active';

    -- Insert new location record
    INSERT INTO location_records (
        unit_id,
        recorded_by,
        latitude,
        longitude,
        notes
    )
    VALUES (
        p_unit_id,
        auth.uid(),
        p_latitude,
        p_longitude,
        p_notes
    )
    RETURNING * INTO v_location_record;

    RETURN json_build_object(
        'success', true,
        'message', 'Location recorded successfully',
        'data', json_build_object(
            'location', v_location_record,
            'unit', v_unit
        )
    );
END;
$$;
