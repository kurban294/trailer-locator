import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import Papa from 'papaparse'
import * as XLSX from 'xlsx-js-style'
import { UNIT_TYPES } from '../constants/unitTypes'

const BatchUpload = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)

  const handleDownloadTemplate = (format = 'csv') => {
    const headers = [
      'unit_number',
      'licence_number',
      'serial_number',
      'unit_type',
      'manufacturer',
      'year',
      'model',
      'parking_location',
      'rag_status'
    ]

    const sampleData = [
      {
        unit_number: 'UNIT001',
        licence_number: 'ABC123',
        serial_number: 'SER123',
        unit_type: UNIT_TYPES[0],
        manufacturer: 'Manufacturer',
        year: '2024',
        model: 'Model',
        parking_location: 'Yard A',
        rag_status: 'RAG 3'
      }
    ]

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers })
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Units')
      
      // Add data validation for unit_type and rag_status
      ws['!dataValidation'] = {
        D2: { // unit_type column
          type: 'list',
          values: UNIT_TYPES
        },
        I2: { // rag_status column
          type: 'list',
          values: ['RAG 1', 'RAG 2', 'RAG 3']
        }
      }
      
      XLSX.writeFile(wb, 'unit_upload_template.xlsx')
    } else {
      const csv = Papa.unparse({
        fields: headers,
        data: sampleData
      })

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.setAttribute('hidden', '')
      a.setAttribute('href', url)
      a.setAttribute('download', 'unit_upload_template.csv')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const validateRow = (row) => {
    const errors = []

    if (!row.unit_number) {
      errors.push('Unit number is required')
    }

    if (!row.unit_type) {
      errors.push('Unit type is required')
    } else if (!UNIT_TYPES.includes(row.unit_type)) {
      errors.push(`Invalid unit type. Must be one of: ${UNIT_TYPES.join(', ')}`)
    }

    if (row.year && (isNaN(row.year) || row.year < 1900 || row.year > new Date().getFullYear())) {
      errors.push('Invalid year')
    }

    if (row.rag_status && !['RAG 1', 'RAG 2', 'RAG 3'].includes(row.rag_status)) {
      errors.push('Invalid RAG status. Must be RAG 1, RAG 2, or RAG 3')
    }

    return errors
  }

  const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target.result
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
          
          // Get headers from first row
          const headers = jsonData[0]
          
          // Convert data to objects using headers
          const rows = jsonData.slice(1).map(row => {
            const obj = {}
            headers.forEach((header, index) => {
              obj[header.toLowerCase()] = row[index]
            })
            return obj
          })
          
          resolve(rows)
        } catch (error) {
          reject(new Error('Error parsing Excel file'))
        }
      }
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setUploadResult(null)

    try {
      let data
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await processExcelFile(file)
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const results = await new Promise((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results)
          })
        })
        data = results.data
      } else {
        throw new Error('Unsupported file format. Please upload a CSV or Excel file.')
      }

      // Validate each row
      const validationErrors = []
      const validData = []

      data.forEach((row, index) => {
        const rowErrors = validateRow(row)
        if (rowErrors.length > 0) {
          validationErrors.push({
            row: index + 1,
            unit_number: row.unit_number || 'N/A',
            errors: rowErrors
          })
        } else {
          validData.push(row)
        }
      })

      if (validationErrors.length > 0) {
        setError({
          message: 'Validation errors found in file',
          errors: validationErrors
        })
        setLoading(false)
        return
      }

      // Upload valid data
      const { data: result, error: uploadError } = await supabase.rpc(
        'batch_upload_units',
        { p_units: validData }
      )

      if (uploadError) throw uploadError

      setUploadResult(result)
      if (result.success) {
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons Section */}
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Upload Options</h3>
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
            <button
              onClick={() => handleDownloadTemplate('csv')}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Download CSV Template
            </button>
            <button
              onClick={() => handleDownloadTemplate('xlsx')}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Download Excel Template
            </button>
            <div className="w-full md:w-auto">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`w-full md:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Uploading...' : 'Upload File'}
              </label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h4 className="text-red-800 font-medium">{error.message || error}</h4>
          {error.errors && (
            <ul className="mt-2 list-disc list-inside text-red-700">
              {error.errors.map((err, index) => (
                <li key={index}>
                  Row {err.row} (Unit: {err.unit_number}):
                  <ul className="ml-4 list-disc list-inside">
                    {err.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {uploadResult && (
        <div
          className={`${
            uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          } border rounded p-4`}
        >
          <h4
            className={`${
              uploadResult.success ? 'text-green-800' : 'text-yellow-800'
            } font-medium`}
          >
            {uploadResult.message}
          </h4>
          {uploadResult.data?.errors?.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-yellow-700">
              {uploadResult.data.errors.map((err, index) => (
                <li key={index}>
                  Unit {err.unit_number}: {err.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default BatchUpload
