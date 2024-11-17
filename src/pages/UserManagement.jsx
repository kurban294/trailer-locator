import { useState, useEffect } from 'react'
import { supabase, getServiceSupabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function UserManagement() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(user => 
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const { data: users, error } = await supabase
        .rpc('fetch_users')

      if (error) throw error

      setUsers(users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user) => {
    console.log('Editing user:', user)
    setEditingUser(user)
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status
    })
    setError(null)
    setSuccessMessage('')
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setFormData({
      first_name: '',
      last_name: '',
      role: 'user',
      status: 'active'
    })
    setError(null)
    setSuccessMessage('')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    if (!editingUser) {
      setError('No user selected for editing')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const updateData = {
        user_id: editingUser.id,
        new_first_name: formData.first_name,
        new_last_name: formData.last_name,
        new_role: formData.role,
        new_status: formData.status
      }

      // Optimistically update the UI
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...formData }
            : user
        )
      )
      
      // Reset form state early
      handleCancelEdit()

      // Make the API call
      const { data, error } = await supabase
        .rpc('update_user', updateData)

      if (error) {
        // Revert the optimistic update on error
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === editingUser.id 
              ? editingUser
              : user
          )
        )
        throw error
      }

      // Show success message after successful update
      setSuccessMessage('User updated successfully!')
    } catch (error) {
      console.error('Error updating user:', error)
      setError(error.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      setSuccessMessage('')

      // First create the user with Supabase auth using service role client
      const serviceSupabase = getServiceSupabase()
      const { data: { user }, error: signUpError } = await serviceSupabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          first_name: formData.first_name,
          last_name: formData.last_name
        }
      })

      if (signUpError) throw signUpError

      // Then create their profile using upsert to handle existing profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          status: formData.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // Reset form and close modal
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active'
      })
      
      setShowCreateModal(false)
      await fetchUsers()
      setSuccessMessage('User created successfully!')
    } catch (error) {
      console.error('Error creating user:', error)
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
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Create New User
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search users by name, email, or role..."
          />
        </div>
      </div>

      {/* Show success message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {successMessage}
        </div>
      )}

      {/* Show error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      {/* User edit form */}
      {editingUser && (
        <form 
          onSubmit={handleUpdateUser} 
          className="mb-8 bg-white shadow-md rounded px-8 pt-6 pb-8"
        >
          <h2 className="text-xl font-bold mb-4">Edit User</h2>
          
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Role
              </label>
              <select
                name="role"
                value={formData.role || 'user'}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status || 'active'}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          {/* Form buttons */}
          <div className="flex justify-end mt-4 space-x-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Role</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  {user.first_name} {user.last_name}
                </td>
                <td className="py-3 px-6 text-left">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.role === 'admin' ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-6 text-left">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-3 px-6 text-left">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="text-blue-600 hover:text-blue-900"
                    disabled={loading}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for both Create and Edit */}
      {(showCreateModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      first_name: '',
                      last_name: '',
                      email: '',
                      password: '',
                      role: 'user',
                      status: 'active'
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
