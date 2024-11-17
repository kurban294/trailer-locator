-- Create function to handle batch unit upload
CREATE OR REPLACE FUNCTION batch_upload_units(
    p_units JSONB[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_errors JSONB[] := ARRAY[]::JSONB[];
    v_unit JSONB;
    v_result JSON;
BEGIN
    -- Get current user ID and role
    SELECT auth.uid() INTO v_user_id;
    SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;

    -- Check if user is admin
    IF v_user_role != 'admin' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Only admins can batch upload units'
        );
    END IF;

    -- Process each unit
    FOREACH v_unit IN ARRAY p_units
    LOOP
        BEGIN
            -- Validate required fields
            IF v_unit->>'unit_number' IS NULL OR v_unit->>'unit_type' IS NULL THEN
                v_errors := array_append(v_errors, json_build_object(
                    'unit_number', v_unit->>'unit_number',
                    'error', 'Unit number and type are required'
                )::JSONB);
                v_error_count := v_error_count + 1;
                CONTINUE;
            END IF;

            -- Check if unit number already exists
            IF EXISTS (SELECT 1 FROM units WHERE unit_number = v_unit->>'unit_number') THEN
                v_errors := array_append(v_errors, json_build_object(
                    'unit_number', v_unit->>'unit_number',
                    'error', 'Unit number already exists'
                )::JSONB);
                v_error_count := v_error_count + 1;
                CONTINUE;
            END IF;

            -- Insert the unit
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
                v_unit->>'unit_number',
                v_unit->>'licence_number',
                v_unit->>'serial_number',
                v_unit->>'unit_type',
                v_unit->>'manufacturer',
                (v_unit->>'year')::INTEGER,
                v_unit->>'model',
                v_unit->>'parking_location',
                COALESCE(v_unit->>'rag_status', 'RAG 3'),
                v_user_id
            );

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, json_build_object(
                'unit_number', v_unit->>'unit_number',
                'error', SQLERRM
            )::JSONB);
            v_error_count := v_error_count + 1;
        END;
    END LOOP;

    -- Return results
    RETURN json_build_object(
        'success', v_error_count = 0,
        'message', format('Processed %s units: %s successful, %s failed', 
                         v_success_count + v_error_count, v_success_count, v_error_count),
        'data', json_build_object(
            'success_count', v_success_count,
            'error_count', v_error_count,
            'errors', v_errors
        )
    );
END;
$$;
