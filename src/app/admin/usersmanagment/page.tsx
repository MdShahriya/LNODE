'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import './usermanagment.css'

interface User {
  id: string
  walletAddress: string
  points: number
  tasksCompleted: number
  uptime: number // in seconds
  nodeStatus: boolean
  nodeStartTime: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminUsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<keyof User>('points')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [nodeFilter, setNodeFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    points: 0
  })

  const usersPerPage = 10

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: usersPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (nodeFilter !== 'all') {
        params.append('nodeFilter', nodeFilter);
      }
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setLoading(false);
    }
  }, [currentPage, usersPerPage, sortBy, sortOrder, searchTerm, nodeFilter]);

  // Format uptime from seconds to readable format
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // Handle sort change
  const handleSortChange = (column: keyof User) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // Handle node filter change
  const handleNodeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNodeFilter(e.target.value as 'all' | 'active' | 'inactive')
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditFormData({
      points: user.points
    })
    setIsEditModalOpen(true)
  }

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  // Handle edit form input change
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData({
      ...editFormData,
      [name]: parseInt(value) || 0
    })
  }

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update user')
      }
      
      const { user: updatedUser } = await response.json()
      
      setUsers(users.map(user => user.id === selectedUser.id ? {
        ...user,
        points: updatedUser.points,
        updatedAt: updatedUser.updatedAt
      } : user))
      
      toast.success('User updated successfully')
      closeEditModal()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  // Reset node status
  const resetNodeStatus = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s node status?')) return
    
    try {
      const response = await fetch(`/api/admin/users/reset-node?userId=${userId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to reset node status')
      }
      
      // Update the user in the local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            nodeStatus: false,
            nodeStartTime: null,
            updatedAt: new Date().toISOString()
          }
        }
        return user
      }))
      
      toast.success('Node status reset successfully')
    } catch (error) {
      console.error('Error resetting node status:', error)
      toast.error('Failed to reset node status')
    }
  }

  // Effect to fetch users when dependencies change
  useEffect(() => {
    fetchUsers()
  }, [currentPage, sortBy, sortOrder, nodeFilter, searchTerm, fetchUsers])

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Apply search filter
      const matchesSearch = user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Apply node status filter
      const matchesNodeFilter = 
        nodeFilter === 'all' ||
        (nodeFilter === 'active' && user.nodeStatus) ||
        (nodeFilter === 'inactive' && !user.nodeStatus)
      
      return matchesSearch && matchesNodeFilter
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortBy === 'uptime') {
        return sortOrder === 'asc' ? a.uptime - b.uptime : b.uptime - a.uptime
      } else if (sortBy === 'points') {
        return sortOrder === 'asc' ? a.points - b.points : b.points - a.points
      } else if (sortBy === 'tasksCompleted') {
        return sortOrder === 'asc' ? a.tasksCompleted - b.tasksCompleted : b.tasksCompleted - a.tasksCompleted
      } else if (sortBy === 'createdAt') {
        return sortOrder === 'asc' 
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() 
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return 0
    })

  // Paginate users
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  )

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    // Update total pages when filtered users change
    setTotalPages(Math.ceil(filteredUsers.length / usersPerPage))
    
    // Reset to first page if current page is out of bounds
    if (currentPage > Math.ceil(filteredUsers.length / usersPerPage)) {
      setCurrentPage(1)
    }
  }, [filteredUsers.length, currentPage])

  return (
    <div className="admin-users">
      <div className="admin-users__container">
        <h1 className="admin-users__title">User Management</h1>
        <p className="admin-users__subtitle">View and manage TOPAY users</p>

        <div className="admin-users__search">
          <input
            type="text"
            placeholder="Search by wallet address"
            value={searchTerm}
            onChange={handleSearchChange}
            className="admin-users__search-input"
          />
        </div>

        <div className="admin-users__filters">
          <div className="admin-users__filter">
            <span className="admin-users__filter-label">Node Status:</span>
            <select
              value={nodeFilter}
              onChange={handleNodeFilterChange}
              className="admin-users__filter-select"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="admin-users__filter">
            <span className="admin-users__filter-label">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as keyof User)}
              className="admin-users__filter-select"
            >
              <option value="points">Points</option>
              <option value="tasksCompleted">Tasks Completed</option>
              <option value="uptime">Uptime</option>
              <option value="createdAt">Join Date</option>
            </select>
          </div>
          
          <div className="admin-users__filter">
            <span className="admin-users__filter-label">Order:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="admin-users__filter-select"
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>
        </div>

        <div className="admin-users__card">
          <h2 className="admin-users__card-title">Users List</h2>
          
          {loading ? (
            <div className="admin-users__loading">
              <div className="admin-users__loading-spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <p>No users found matching your criteria.</p>
          ) : (
            <>
              <div className="admin-users__table-container">
                <table className="admin-users__table">
                  <thead>
                    <tr>
                      <th>Wallet Address</th>
                      <th>Points</th>
                      <th>Tasks Completed</th>
                      <th>Uptime</th>
                      <th>Node Status</th>
                      <th>Join Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.walletAddress}</td>
                        <td>{user.points}</td>
                        <td>{user.tasksCompleted}</td>
                        <td>{formatUptime(user.uptime)}</td>
                        <td>
                          <div className="node-status">
                            <div className={`node-status__indicator ${user.nodeStatus ? 'active' : 'inactive'}`}></div>
                            {user.nodeStatus ? 'Active' : 'Inactive'}
                          </div>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="admin-users__table-actions">
                            <button
                              onClick={() => openEditModal(user)}
                              className="admin-button admin-button--secondary"
                            >
                              Edit
                            </button>
                            {user.nodeStatus && (
                              <button
                                onClick={() => resetNodeStatus(user.id)}
                                className="admin-button admin-button--danger"
                              >
                                Reset Node
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="admin-users__pagination">
                <div className="admin-users__pagination-info">
                  Showing {(currentPage - 1) * usersPerPage + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="admin-users__pagination-buttons">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="admin-users__pagination-button"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show 5 pages max, centered around current page
                    let pageNum = currentPage
                    if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    // Only show valid page numbers
                    if (pageNum > 0 && pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`admin-users__pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    return null
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="admin-users__pagination-button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="admin-users__modal">
          <div className="admin-users__modal-content">
            <div className="admin-users__modal-header">
              <h3 className="admin-users__modal-title">Edit User</h3>
              <button
                onClick={closeEditModal}
                className="admin-users__modal-close"
              >
                &times;
              </button>
            </div>
            <div className="admin-users__modal-body">
              <p>Wallet Address: {selectedUser.walletAddress}</p>
              <form onSubmit={handleEditSubmit}>
                <div className="admin-users__form-group">
                  <label className="admin-users__form-label" htmlFor="points">
                    Points
                  </label>
                  <input
                    type="number"
                    id="points"
                    name="points"
                    value={editFormData.points}
                    onChange={handleEditInputChange}
                    className="admin-users__form-input"
                    min="0"
                  />
                </div>
                <div className="admin-users__modal-footer">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="admin-button admin-button--secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-button admin-button--primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}