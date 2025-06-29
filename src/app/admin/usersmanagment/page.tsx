'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import './usermanagment.css'

interface User {
  id: string
  walletAddress: string
  username?: string
  points: number
  tasksCompleted: number
  uptime: number // in seconds
  nodeStatus: boolean
  nodeStartTime: string | null
  verification?: string // 'verified', 'unverified', or 'pending'
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
    points: 0,
    verification: 'unverified'
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
      points: user.points,
      verification: user.verification || 'unverified'
    })
    setIsEditModalOpen(true)
  }

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  // Handle edit form input change
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData({
      ...editFormData,
      [name]: name === 'points' ? (parseInt(value) || 0) : value
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
        verification: updatedUser.verification,
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
        {/* Header Section */}
        <div className="admin-users__header">
          <div className="admin-users__header-content">
            <h1 className="admin-users__title">
              <span className="admin-users__title-icon">👥</span>
              User Management
            </h1>
            <p className="admin-users__subtitle">Manage and monitor TOPAY network participants</p>
          </div>
          <div className="admin-users__stats">
            <div className="admin-users__stat-card">
              <div className="admin-users__stat-value">{users.length}</div>
              <div className="admin-users__stat-label">Total Users</div>
            </div>
            <div className="admin-users__stat-card">
              <div className="admin-users__stat-value">{users.filter(u => u.nodeStatus).length}</div>
              <div className="admin-users__stat-label">Active Nodes</div>
            </div>
            <div className="admin-users__stat-card">
              <div className="admin-users__stat-value">{users.filter(u => u.verification === 'verified').length}</div>
              <div className="admin-users__stat-label">Verified Users</div>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="admin-users__controls">
          <div className="admin-users__search-section">
            <div className="admin-users__search">
              <div className="admin-users__search-icon">🔍</div>
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="admin-users__search-input"
              />
            </div>
          </div>

          <div className="admin-users__filters">
            <div className="admin-users__filter">
              <label className="admin-users__filter-label">Node Status</label>
              <select
                value={nodeFilter}
                onChange={handleNodeFilterChange}
                className="admin-users__filter-select"
              >
                <option value="all">All Nodes</option>
                <option value="active">🟢 Active</option>
                <option value="inactive">🔴 Inactive</option>
              </select>
            </div>
            
            <div className="admin-users__filter">
              <label className="admin-users__filter-label">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as keyof User)}
                className="admin-users__filter-select"
              >
                <option value="points">💰 Points</option>
                <option value="tasksCompleted">✅ Tasks</option>
                <option value="uptime">⏱️ Uptime</option>
                <option value="createdAt">📅 Join Date</option>
              </select>
            </div>
            
            <div className="admin-users__filter">
              <label className="admin-users__filter-label">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="admin-users__filter-select"
              >
                <option value="desc">📈 Highest First</option>
                <option value="asc">📉 Lowest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table Section */}
        <div className="admin-users__main-content">
          <div className="admin-users__table-header">
            <h2 className="admin-users__table-title">
              <span className="admin-users__table-icon">📊</span>
              Users Overview
            </h2>
            <div className="admin-users__table-info">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>
          
          {loading ? (
            <div className="admin-users__loading">
              <div className="admin-users__loading-spinner"></div>
              <div className="admin-users__loading-text">
                <h3>Loading Users...</h3>
                <p>Fetching user data from the network</p>
              </div>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="admin-users__empty-state">
              <div className="admin-users__empty-icon">🔍</div>
              <h3>No Users Found</h3>
              <p>No users match your current search criteria. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="admin-users__table-container">
                <table className="admin-users__table">
                  <thead>
                    <tr>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('walletAddress')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">👤</span>
                          Wallet Address
                          {sortBy === 'walletAddress' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('points')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">💰</span>
                          Points
                          {sortBy === 'points' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('tasksCompleted')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">✅</span>
                          Tasks
                          {sortBy === 'tasksCompleted' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('uptime')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">⏱️</span>
                          Uptime
                          {sortBy === 'uptime' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('nodeStatus')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">🔗</span>
                          Node Status
                          {sortBy === 'nodeStatus' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('verification')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">🛡️</span>
                          Verification
                          {sortBy === 'verification' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header clickable" onClick={() => handleSortChange('createdAt')}>
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">📅</span>
                          Joined
                          {sortBy === 'createdAt' && <span className="admin-users__sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className="admin-users__table-header">
                        <span className="admin-users__header-content">
                          <span className="admin-users__header-icon">⚙️</span>
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="admin-users__table-row">
                        <td className="admin-users__table-cell">
                          <div className="admin-users__wallet-info">
                            <div className="admin-users__wallet-address">
                              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                            </div>
                            <div className="admin-users__wallet-full" title={user.walletAddress}>
                              {user.walletAddress}
                            </div>
                          </div>
                        </td>
                        <td className="admin-users__table-cell">
                          <div className="admin-users__points">
                            <span className="admin-users__points-value">{user.points.toLocaleString()}</span>
                            <span className="admin-users__points-label">pts</span>
                          </div>
                        </td>
                        <td className="admin-users__table-cell">
                          <div className="admin-users__tasks">
                            <span className="admin-users__tasks-value">{user.tasksCompleted}</span>
                            <span className="admin-users__tasks-label">completed</span>
                          </div>
                        </td>
                        <td className="admin-users__table-cell">
                          <div className="admin-users__uptime">
                            {formatUptime(user.uptime)}
                          </div>
                        </td>
                        <td className="admin-users__table-cell">
                          <div className={`node-status ${user.nodeStatus ? 'active' : 'inactive'}`}>
                            <div className={`node-status__indicator ${user.nodeStatus ? 'active' : 'inactive'}`}></div>
                            <span className="node-status__text">{user.nodeStatus ? 'Active' : 'Inactive'}</span>
                          </div>
                        </td>
                        <td className="admin-users__table-cell">
                          <span className={`verification-status ${user.verification || 'unverified'}`}>
                            {user.verification === 'verified' ? '✅ Verified' : 
                             user.verification === 'pending' ? '⏳ Pending' : 
                             '❌ Unverified'}
                          </span>
                        </td>
                        <td className="admin-users__table-cell">
                          <div className="admin-users__date">
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="admin-users__table-cell">
                          <div className="admin-users__table-actions">
                            <button
                              onClick={() => openEditModal(user)}
                              className="admin-button admin-button--edit"
                              title="Edit user"
                            >
                              <span className="admin-button__icon">✏️</span>
                              Edit
                            </button>
                            {user.nodeStatus && (
                              <button
                                onClick={() => resetNodeStatus(user.id)}
                                className="admin-button admin-button--reset"
                                title="Reset node status"
                              >
                                <span className="admin-button__icon">🔄</span>
                                Reset
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
                  <span className="admin-users__pagination-text">
                    Showing <strong>{(currentPage - 1) * usersPerPage + 1}</strong> to <strong>{Math.min(currentPage * usersPerPage, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> users
                  </span>
                </div>
                <div className="admin-users__pagination-controls">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="admin-users__pagination-button admin-users__pagination-button--first"
                    title="First page"
                  >
                    ⏮️
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="admin-users__pagination-button admin-users__pagination-button--prev"
                    title="Previous page"
                  >
                    ⬅️ Previous
                  </button>
                  
                  <div className="admin-users__pagination-numbers">
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
                            className={`admin-users__pagination-button admin-users__pagination-button--number ${currentPage === pageNum ? 'admin-users__pagination-button--active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        )
                      }
                      return null
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="admin-users__pagination-button admin-users__pagination-button--next"
                    title="Next page"
                  >
                    Next ➡️
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="admin-users__pagination-button admin-users__pagination-button--last"
                    title="Last page"
                  >
                    ⏭️
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="admin-users__modal" onClick={closeEditModal}>
          <div className="admin-users__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-users__modal-header">
              <div className="admin-users__modal-title-section">
                <h3 className="admin-users__modal-title">
                  <span className="admin-users__modal-icon">✏️</span>
                  Edit User Profile
                </h3>
                <p className="admin-users__modal-subtitle">Modify user settings and permissions</p>
              </div>
              <button
                onClick={closeEditModal}
                className="admin-users__modal-close"
                title="Close modal"
              >
                ✕
              </button>
            </div>
            
            <div className="admin-users__modal-body">
              <div className="admin-users__user-info">
                <div className="admin-users__user-avatar">
                  <span className="admin-users__avatar-icon">👤</span>
                </div>
                <div className="admin-users__user-details">
                  <h4 className="admin-users__user-wallet">Wallet Address</h4>
                  <p className="admin-users__wallet-address-full" title={selectedUser.walletAddress}>
                    {selectedUser.walletAddress}
                  </p>
                  <div className="admin-users__user-stats">
                    <span className="admin-users__user-stat">
                      <span className="admin-users__stat-icon">📅</span>
                      Joined: {formatDate(selectedUser.createdAt)}
                    </span>
                    <span className="admin-users__user-stat">
                      <span className="admin-users__stat-icon">✅</span>
                      Tasks: {selectedUser.tasksCompleted}
                    </span>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleEditSubmit} className="admin-users__edit-form">
                <div className="admin-users__form-row">
                  <div className="admin-users__form-group">
                    <label className="admin-users__form-label" htmlFor="points">
                      <span className="admin-users__label-icon">💰</span>
                      Points Balance
                    </label>
                    <div className="admin-users__input-wrapper">
                      <input
                        type="number"
                        id="points"
                        name="points"
                        value={editFormData.points}
                        onChange={handleEditInputChange}
                        className="admin-users__form-input"
                        min="0"
                        placeholder="Enter points amount"
                      />
                      <span className="admin-users__input-suffix">pts</span>
                    </div>
                    <p className="admin-users__form-help">Current: {selectedUser.points.toLocaleString()} points</p>
                  </div>
                  
                  <div className="admin-users__form-group">
                    <label className="admin-users__form-label" htmlFor="verification">
                      <span className="admin-users__label-icon">🛡️</span>
                      Verification Status
                    </label>
                    <select
                      id="verification"
                      name="verification"
                      value={editFormData.verification}
                      onChange={handleEditInputChange}
                      className="admin-users__form-select"
                    >
                      <option value="unverified">❌ Unverified</option>
                      <option value="pending">⏳ Pending Review</option>
                      <option value="verified">✅ Verified</option>
                    </select>
                    <p className="admin-users__form-help">Current: {selectedUser.verification || 'unverified'}</p>
                  </div>
                </div>
                
                <div className="admin-users__modal-footer">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="admin-button admin-button--cancel"
                  >
                    <span className="admin-button__icon">❌</span>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-button admin-button--save"
                  >
                    <span className="admin-button__icon">💾</span>
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