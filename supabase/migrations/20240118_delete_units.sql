-- Add delete policy for units table
CREATE POLICY "Only admins can delete units"
    ON units
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Update manage_unit function to include delete operation
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

        WHEN 'DELETE' THEN
            -- Check if unit exists
            IF NOT EXISTS (SELECT 1 FROM units WHERE id = p_unit_id) THEN
                RETURN json_build_object('success', false, 'message', 'Unit not found');
            END IF;

            DELETE FROM units WHERE id = p_unit_id
            RETURNING json_build_object(
                'success', true,
                'message', 'Unit deleted successfully',
                'data', json_build_object(
                    'id', id
                )
            ) INTO v_result;

        ELSE
            RETURN json_build_object('success', false, 'message', 'Invalid operation');
    END CASE;

    RETURN COALESCE(v_result, json_build_object('success', false, 'message', 'Operation failed'));
END;
$$;
