-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_number VARCHAR(50) NOT NULL UNIQUE,
    licence_number VARCHAR(50),
    serial_number VARCHAR(50),
    unit_type VARCHAR(50) CHECK (
        unit_type IN (
            'Trailer - Curtainsider',
            'Trailer - DD Curtainsider',
            'Trailer - Flatbed',
            'Trailer - Box Van',
            'Trailer - DD Box Van',
            'Trailer - Reefer',
            'Trailer - DD Reefer',
            'Trailer - Chassiss',
            'Vehicle - Tractor Unit',
            'Vehicle - Van',
            'Vehicle - Semi'
        )
    ),
    manufacturer VARCHAR(100),
    year INTEGER CHECK (year > 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE)),
    model VARCHAR(100),
    parking_location TEXT,
    rag_status VARCHAR(20) CHECK (rag_status IN ('RAG 1', 'RAG 2', 'RAG 3')),
    last_known_latitude DECIMAL(10, 8),
    last_known_longitude DECIMAL(11, 8),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    CONSTRAINT valid_latitude CHECK (last_known_latitude IS NULL OR (last_known_latitude >= -90 AND last_known_latitude <= 90)),
    CONSTRAINT valid_longitude CHECK (last_known_longitude IS NULL OR (last_known_longitude >= -180 AND last_known_longitude <= 180))
);

-- Create RLS policies
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Policy for viewing units (all authenticated users can view)
CREATE POLICY "Users can view all units"
    ON units
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for inserting units (admin only)
CREATE POLICY "Only admins can create units"
    ON units
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy for updating units (admin only)
CREATE POLICY "Only admins can update units"
    ON units
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create function to manage units
CREATE OR REPLACE FUNCTION manage_unit(
    p_operation TEXT,
    p_unit_id UUID DEFAULT NULL,
    p_unit_number VARCHAR DEFAULT NULL,
    p_licence_number VARCHAR DEFAULT NULL,
    p_serial_number VARCHAR DEFAULT NULL,
    p_unit_type VARCHAR DEFAULT NULL,
    p_manufacturer VARCHAR DEFAULT NULL,
    p_year INTEGER DEFAULT NULL,
    p_model VARCHAR DEFAULT NULL,
    p_parking_location TEXT DEFAULT NULL,
    p_rag_status VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_result JSON;
BEGIN
    -- Get current user ID and role
    SELECT auth.uid() INTO v_user_id;
    SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;

    -- Check if user is admin
    IF v_user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Only admins can manage units');
    END IF;

    CASE p_operation
        WHEN 'CREATE' THEN
            -- Check if unit number already exists
            IF EXISTS (SELECT 1 FROM units WHERE unit_number = p_unit_number) THEN
                RETURN json_build_object('success', false, 'message', 'Unit number already exists');
            END IF;

            INSERT INTO units (
                unit_number,
                licence_number,
                serial_number,
                unit_type,
                manufacturer,
                year,
                model,
                parking_location,
                rag_status,
                created_by
            )
            VALUES (
                p_unit_number,
                p_licence_number,
                p_serial_number,
                p_unit_type,
                p_manufacturer,
                p_year,
                p_model,
                p_parking_location,
                p_rag_status,
                v_user_id
            )
            RETURNING json_build_object(
                'success', true,
                'message', 'Unit created successfully',
                'data', json_build_object(
                    'id', id,
                    'unit_number', unit_number,
                    'licence_number', licence_number,
                    'serial_number', serial_number,
                    'unit_type', unit_type,
                    'manufacturer', manufacturer,
                    'year', year,
                    'model', model,
                    'parking_location', parking_location,
                    'rag_status', rag_status
                )
            ) INTO v_result;

        WHEN 'UPDATE' THEN
            -- Check if unit exists
            IF NOT EXISTS (SELECT 1 FROM units WHERE id = p_unit_id) THEN
                RETURN json_build_object('success', false, 'message', 'Unit not found');
            END IF;

            -- Check if new unit number conflicts with existing ones
            IF p_unit_number IS NOT NULL AND EXISTS (
                SELECT 1 FROM units 
                WHERE unit_number = p_unit_number 
                AND id != p_unit_id
            ) THEN
                RETURN json_build_object('success', false, 'message', 'Unit number already exists');
            END IF;

            UPDATE units
            SET
                unit_number = COALESCE(p_unit_number, unit_number),
                licence_number = COALESCE(p_licence_number, licence_number),
                serial_number = COALESCE(p_serial_number, serial_number),
                unit_type = COALESCE(p_unit_type, unit_type),
                manufacturer = COALESCE(p_manufacturer, manufacturer),
                year = COALESCE(p_year, year),
                model = COALESCE(p_model, model),
                parking_location = COALESCE(p_parking_location, parking_location),
                rag_status = COALESCE(p_rag_status, rag_status),
                last_updated_at = NOW(),
                last_updated_by = v_user_id
            WHERE id = p_unit_id
            RETURNING json_build_object(
                'success', true,
                'message', 'Unit updated successfully',
                'data', json_build_object(
                    'id', id,
                    'unit_number', unit_number,
                    'licence_number', licence_number,
                    'serial_number', serial_number,
                    'unit_type', unit_type,
                    'manufacturer', manufacturer,
                    'year', year,
                    'model', model,
                    'parking_location', parking_location,
                    'rag_status', rag_status
                )
            ) INTO v_result;

        ELSE
            RETURN json_build_object('success', false, 'message', 'Invalid operation');
    END CASE;

    RETURN v_result;
END;
$$;
