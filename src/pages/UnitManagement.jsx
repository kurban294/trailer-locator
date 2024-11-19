import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import BatchUpload from '../components/BatchUpload'
import { UNIT_TYPES } from '../constants/unitTypes'
import { UNIT_STATUSES } from '../constants/unitStatus'

const RAG_STATUSES = [
  { value: 'RAG 1', label: 'Red - RAG 1' },
  { value: 'RAG 2', label: 'Amber - RAG 2' },
  { value: 'RAG 3', label: 'Green - RAG 3' }
]

export default function UnitManagement() {
  const { profile } = useAuth()
  const [units, setUnits] = useState([])
  const [filteredUnits, setFilteredUnits] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingUnit, setEditingUnit] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [formData, setFormData] = useState({
    unit_number: '',
    licence_number: '',
    serial_number: '',
    unit_type: UNIT_TYPES[0],
    manufacturer: '',
    model: '',
    year: new Date().getFullYear(),
    parking_location: '',
    rag_status: 'RAG 3',
    unit_status: UNIT_STATUSES[0],
    x_ref_number: ''
  })
  const [showBatchUpload, setShowBatchUpload] = useState(false)

  useEffect(() => {
    fetchUnits()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUnits(units)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = units.filter(unit => 
        unit.unit_number?.toLowerCase().includes(query) ||
        unit.licence_number?.toLowerCase().includes(query) ||
        unit.serial_number?.toLowerCase().includes(query) ||
        unit.unit_type?.toLowerCase().includes(query) ||
        unit.manufacturer?.toLowerCase().includes(query) ||
        unit.model?.toLowerCase().includes(query) ||
        unit.parking_location?.toLowerCase().includes(query) ||
        unit.x_ref_number?.toLowerCase().includes(query)
      )
      setFilteredUnits(filtered)
    }
  }, [searchQuery, units])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const { data: units, error } = await supabase
        .from('units')
        .select('*')
        .order('unit_number')

      if (error) throw error

      setUnits(units || [])
      setFilteredUnits(units || [])
    } catch (error) {
      console.error('Error fetching units:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUnit = (unit) => {
    setEditingUnit(unit)
    setFormData({
      unit_number: unit.unit_number,
      licence_number: unit.licence_number || '',
      serial_number: unit.serial_number || '',
      unit_type: unit.unit_type,
      manufacturer: unit.manufacturer || '',
      model: unit.model || '',
      year: unit.year || '',
      parking_location: unit.parking_location || '',
      rag_status: unit.rag_status || 'RAG 3',
      unit_status: unit.unit_status || UNIT_STATUSES[0],
      x_ref_number: unit.x_ref_number || ''
    })
    setShowCreateModal(true)
    setShowDetailsModal(false)
    setSelectedUnit(null)
  }

  const handleCancelEdit = () => {
    setEditingUnit(null)
    setShowCreateModal(false)
    setFormData({
      unit_number: '',
      licence_number: '',
      serial_number: '',
      unit_type: UNIT_TYPES[0],
      manufacturer: '',
      model: '',
      year: '',
      parking_location: '',
      rag_status: 'RAG 3',
      unit_status: UNIT_STATUSES[0],
      x_ref_number: ''
    })
    setError(null)
    setSuccessMessage('')
  }

  const handleDeleteClick = (unit) => {
    setUnitToDelete(unit)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!unitToDelete) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('manage_unit', {
        p_operation: 'DELETE',
        p_unit_id: unitToDelete.id
      })

      if (error) throw error
      if (!data.success) throw new Error(data.message)

      // Remove the deleted unit from the state
      setUnits(prevUnits => prevUnits.filter(unit => unit.id !== unitToDelete.id))
      setShowDeleteConfirm(false)
      setUnitToDelete(null)
      setSuccessMessage('Unit deleted successfully!')
    } catch (error) {
      console.error('Error deleting unit:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (unit, e) => {
    // Prevent row click when clicking on action buttons
    if (e.target.tagName === 'BUTTON') return
    setSelectedUnit(unit)
    setShowDetailsModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || '' : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('manage_unit', {
        p_operation: editingUnit ? 'UPDATE' : 'CREATE',
        p_unit_id: editingUnit?.id || null,
        p_unit_number: formData.unit_number,
        p_licence_number: formData.licence_number,
        p_serial_number: formData.serial_number,
        p_unit_type: formData.unit_type,
        p_manufacturer: formData.manufacturer,
        p_year: formData.year ? parseInt(formData.year) : null,
        p_model: formData.model,
        p_parking_location: formData.parking_location,
        p_rag_status: formData.rag_status,
        p_unit_status: formData.unit_status,
        p_x_ref_number: formData.x_ref_number
      })

      if (error) throw error
      if (!data.success) throw new Error(data.message)

      // Update the units list with the new/updated unit
      if (editingUnit) {
        setUnits(prevUnits =>
          prevUnits.map(unit =>
            unit.id === editingUnit.id ? { ...unit, ...formData } : unit
          )
        )
      } else {
        // For new units, we'll refresh the list to get the new unit with its ID
        fetchUnits()
      }

      setSuccessMessage(editingUnit ? 'Unit updated successfully!' : 'Unit created successfully!')
      
      // Reset all form and modal states
      setFormData({
        unit_number: '',
        licence_number: '',
        serial_number: '',
        unit_type: UNIT_TYPES[0],
        manufacturer: '',
        model: '',
        year: '',
        parking_location: '',
        rag_status: 'RAG 3',
        unit_status: UNIT_STATUSES[0],
        x_ref_number: ''
      })
      setEditingUnit(null)
      setShowCreateModal(false)
      setShowDetailsModal(false) // Also close details modal if it was open
      setSelectedUnit(null) // Clear selected unit
    } catch (error) {
      console.error('Error managing unit:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUnit = async (e) => {
    e.preventDefault()
    
    if (!editingUnit) {
      setError('No unit selected for editing')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('manage_unit', {
        p_operation: 'UPDATE',
        p_unit_id: editingUnit.id,
        p_unit_number: formData.unit_number,
        p_licence_number: formData.licence_number,
        p_serial_number: formData.serial_number,
        p_unit_type: formData.unit_type,
        p_manufacturer: formData.manufacturer,
        p_year: formData.year,
        p_model: formData.model,
        p_parking_location: formData.parking_location,
        p_rag_status: formData.rag_status,
        p_unit_status: formData.unit_status,
        p_x_ref_number: formData.x_ref_number
      })

      if (error) throw error
      if (!data.success) throw new Error(data.message)

      // Optimistically update the UI
      setUnits(prevUnits => 
        prevUnits.map(unit => 
          unit.id === editingUnit.id 
            ? { ...unit, ...formData }
            : unit
        )
      )

      handleCancelEdit()
      setSuccessMessage('Unit updated successfully!')
    } catch (error) {
      console.error('Error updating unit:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUnit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      setSuccessMessage('')

      const { data, error } = await supabase.rpc('manage_unit', {
        p_operation: 'CREATE',
        p_unit_number: formData.unit_number,
        p_licence_number: formData.licence_number,
        p_serial_number: formData.serial_number,
        p_unit_type: formData.unit_type,
        p_manufacturer: formData.manufacturer,
        p_year: formData.year,
        p_model: formData.model,
        p_parking_location: formData.parking_location,
        p_rag_status: formData.rag_status,
        p_unit_status: formData.unit_status,
        p_x_ref_number: formData.x_ref_number
      })

      if (error) throw error
      if (!data.success) throw new Error(data.message)

      // Reset form and fetch updated units
      setFormData({
        unit_number: '',
        licence_number: '',
        serial_number: '',
        unit_type: UNIT_TYPES[0],
        manufacturer: '',
        year: new Date().getFullYear(),
        model: '',
        parking_location: '',
        rag_status: 'RAG 3',
        unit_status: UNIT_STATUSES[0],
        x_ref_number: ''
      })
      
      setShowCreateModal(false)
      await fetchUnits()
      setSuccessMessage('Unit created successfully!')
    } catch (error) {
      console.error('Error creating unit:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!profile?.role === 'admin') {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Unit Management</h1>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-4">
              <button
                onClick={() => setShowBatchUpload(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
              >
                Batch Upload
              </button>
              <button
                onClick={() => {
                  setEditingUnit(null)
                  setShowCreateModal(true)
                }}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {/* Units Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : filteredUnits.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">No units found</td>
              </tr>
            ) : (
              filteredUnits.map((unit) => (
                <tr 
                  key={unit.id}
                  onClick={(e) => handleRowClick(unit, e)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">{unit.unit_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{unit.unit_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{unit.manufacturer}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{unit.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{unit.parking_location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${unit.rag_status === 'RAG 1' ? 'bg-red-100 text-red-800' :
                        unit.rag_status === 'RAG 2' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'}`}>
                      {unit.rag_status}
                    </span>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => handleEditUnit(unit)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(unit)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Unit Modal */}
      {(showCreateModal || editingUnit) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => handleCancelEdit()} />

            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl">
              <div className="bg-white">
                {/* Header */}
                <div className="border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {editingUnit ? 'Edit Unit' : 'Create New Unit'}
                    </h3>
                    <button
                      onClick={() => handleCancelEdit()}
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Basic Information */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Unit Number</label>
                            <input
                              type="text"
                              name="unit_number"
                              value={formData.unit_number}
                              onChange={handleInputChange}
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Unit Type</label>
                            <select
                              name="unit_type"
                              value={formData.unit_type}
                              onChange={handleInputChange}
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            >
                              {UNIT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Unit Status</label>
                            <select
                              name="unit_status"
                              value={formData.unit_status}
                              onChange={handleInputChange}
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            >
                              {UNIT_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">X-Ref Number</label>
                            <input
                              type="text"
                              name="x_ref_number"
                              value={formData.x_ref_number}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Vehicle Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                            <input
                              type="text"
                              name="manufacturer"
                              value={formData.manufacturer}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Model</label>
                            <input
                              type="text"
                              name="model"
                              value={formData.model}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input
                              type="number"
                              name="year"
                              value={formData.year}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Registration Information */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Registration Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">License Number</label>
                            <input
                              type="text"
                              name="licence_number"
                              value={formData.licence_number}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                            <input
                              type="text"
                              name="serial_number"
                              value={formData.serial_number}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location & Status */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Location & Status
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Parking Location</label>
                            <input
                              type="text"
                              name="parking_location"
                              value={formData.parking_location}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">RAG Status</label>
                            <select
                              name="rag_status"
                              value={formData.rag_status}
                              onChange={handleInputChange}
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            >
                              {RAG_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        editingUnit ? 'Update Unit' : 'Create Unit'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelEdit()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Unit</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this unit? This action cannot be undone.
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {unitToDelete?.unit_number}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setUnitToDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-gray-900">
                Batch Upload Units
              </h3>
              <button
                onClick={() => setShowBatchUpload(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="mt-4">
              <BatchUpload
                onSuccess={() => {
                  setShowBatchUpload(false)
                  fetchUnits()
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Unit Details Modal */}
      {showDetailsModal && selectedUnit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailsModal(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl">
              <div className="bg-white">
                {/* Header */}
                <div className="border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Unit Details
                    </h3>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Basic Information
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Unit Number</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.unit_number}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Type</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.unit_type}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Status</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.unit_status || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">X-Ref Number</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.x_ref_number || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Vehicle Information
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Manufacturer</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.manufacturer || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Model</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.model || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Year</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.year || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-6">
                      {/* Registration Information */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Registration Information
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">License Number</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.licence_number || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Serial Number</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.serial_number || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Location & Status */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Location & Status
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Parking Location</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUnit.parking_location || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">RAG Status</span>
                            <p className="mt-1">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                selectedUnit.rag_status === 'RAG 1' ? 'bg-red-100 text-red-800' :
                                selectedUnit.rag_status === 'RAG 2' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'}`}>
                                {selectedUnit.rag_status}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Audit Information */}
                      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          Audit Information
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-500">Last Updated</span>
                            <p className="mt-1 text-sm text-gray-900 font-medium">
                              {selectedUnit.last_updated_at ? new Date(selectedUnit.last_updated_at).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    onClick={() => handleEditUnit(selectedUnit)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Edit Unit
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
