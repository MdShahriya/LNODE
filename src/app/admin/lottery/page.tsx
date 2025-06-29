'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { FaPlus, FaEdit, FaTrash, FaDice } from 'react-icons/fa'
import './lottery.css'

interface LotteryWinner {
  id?: string
  date: Date | string
  walletAddress: string
  username: string | null
  prize: number
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

export default function AdminLotteryPage() {
  const [winners, setWinners] = useState<LotteryWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRandomDrawModal, setShowRandomDrawModal] = useState(false)
  const [editingWinner, setEditingWinner] = useState<LotteryWinner | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  })
  const [pageSize, setPageSize] = useState(20)
  const [randomDrawing, setRandomDrawing] = useState(false)

  // New winner form state
  const [newWinner, setNewWinner] = useState<LotteryWinner>(() => {
    const today = new Date()
    const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return {
      date: localDate.toISOString().split('T')[0],
      walletAddress: '',
      username: null,
      prize: 40
    }
  })



  // Fetch lottery winners
  const fetchWinners = async (page = 1, limit = 10) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/lottery/winners?page=${page}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch lottery winners')
      }
      
      const data = await response.json()
      setWinners(data.winners)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching lottery winners:', error)
      toast.error('Failed to load lottery winners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWinners(pagination.page, pageSize)
  }, [pagination.page, pageSize])

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPagination(prev => ({ ...prev, limit: newSize, page: 1 }))
    fetchWinners(1, newSize)
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const updatingWinner = editingWinner ? editingWinner : newWinner
    
    if (name === 'prizeAmount' || name === 'drawNumber' || name === 'totalParticipants' || name === 'prize') {
      const updatedWinner = {
        ...updatingWinner,
        [name]: parseInt(value) || 0
      }
      
      if (editingWinner) {
        setEditingWinner(updatedWinner)
      } else {
        setNewWinner(updatedWinner)
      }
    } else if (name === 'displayName') {
      const updatedWinner = {
        ...updatingWinner,
        [name]: value === '' ? null : value
      }
      
      if (editingWinner) {
        setEditingWinner(updatedWinner)
      } else {
        setNewWinner(updatedWinner)
      }
    } else {
      const updatedWinner = {
        ...updatingWinner,
        [name]: value
      }
      
      if (editingWinner) {
        setEditingWinner(updatedWinner)
      } else {
        setNewWinner(updatedWinner)
      }
    }
  }

  // Add new lottery winner
  const addWinner = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/admin/lottery/winners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWinner)
      })
      
      if (!response.ok) {
        throw new Error('Failed to add lottery winner')
      }
      
      toast.success('Lottery winner added successfully')
      setShowModal(false)
      const today = new Date()
      const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      setNewWinner({
        date: localDate.toISOString().split('T')[0],
        walletAddress: '',
        username: null,
        prize: 40
      })
      fetchWinners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Error adding lottery winner:', error)
      toast.error('Failed to add lottery winner')
    }
  }

  // Update lottery winner
  const updateWinner = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingWinner || !editingWinner.id) return
    
    try {
      const response = await fetch(`/api/admin/lottery/winners/${editingWinner.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingWinner)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update lottery winner')
      }
      
      toast.success('Lottery winner updated successfully')
      setShowModal(false)
      setEditingWinner(null)
      fetchWinners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Error updating lottery winner:', error)
      toast.error('Failed to update lottery winner')
    }
  }

  // Delete lottery winner
  const deleteWinner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lottery winner?')) return
    
    try {
      const response = await fetch(`/api/admin/lottery/winners/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete lottery winner')
      }
      
      toast.success('Lottery winner deleted successfully')
      fetchWinners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Error deleting lottery winner:', error)
      toast.error('Failed to delete lottery winner')
    }
  }

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Open modal for editing
  const openEditModal = (winner: LotteryWinner) => {
    // Convert date to YYYY-MM-DD format for input[type="date"]
    const formattedWinner = {
      ...winner,
      date: new Date(winner.date).toISOString().split('T')[0]
    }
    setEditingWinner(formattedWinner)
    setShowModal(true)
  }

  // Open modal for adding
  const openAddModal = () => {
    setEditingWinner(null)
    setShowModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setEditingWinner(null)
  }

  // Random draw functions
  const openRandomDrawModal = () => {
    setShowRandomDrawModal(true)
  }

  const closeRandomDrawModal = () => {
    setShowRandomDrawModal(false)
  }



  // Generate random winner
  const generateRandomWinner = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setRandomDrawing(true)
    
    try {
      // Fetch verified users from the database
      const usersResponse = await fetch('/api/admin/users?verification=verified')
      
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch verified users')
      }
      
      const usersData = await usersResponse.json()
      const verifiedUsers = usersData.users || []
      
      // Debug: Log the response to check filtering
      console.log('API Response:', usersData)
      console.log('Verified users count:', verifiedUsers.length)
      console.log('Sample users:', verifiedUsers.slice(0, 3).map((u: { walletAddress: string; verification: unknown }) => ({ 
        walletAddress: u.walletAddress?.slice(0, 6) + '...', 
        verification: u.verification 
      })))
      
      // Additional check: Filter again on client side to ensure only verified users
      const actuallyVerifiedUsers = verifiedUsers.filter((user: { verification: string }) => user.verification === 'verified')
      
      console.log('Actually verified users count:', actuallyVerifiedUsers.length)
      
      if (actuallyVerifiedUsers.length === 0) {
        toast.error('No verified users found for the raffle draw')
        return
      }
      
      // Simulate random selection process
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay for effect
      
      // Select random winner from actually verified users
      const randomIndex = Math.floor(Math.random() * actuallyVerifiedUsers.length)
      const selectedUser = actuallyVerifiedUsers[randomIndex]
      
      console.log('Selected winner:', {
        walletAddress: selectedUser.walletAddress?.slice(0, 6) + '...',
        verification: selectedUser.verification,
        username: selectedUser.username
      })
      
      // Create today's date in local timezone
      const today = new Date()
      const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const winnerData: LotteryWinner = {
        date: localDate.toISOString(),
        walletAddress: selectedUser.walletAddress,
        username: selectedUser.username || 'Anonymous',
        prize: 40
      }

      // Add the winner to database
      const response = await fetch('/api/admin/lottery/winners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(winnerData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save random winner')
      }
      
      toast.success(`🎉 Random winner selected! ${winnerData.username} (${winnerData.walletAddress.slice(0, 6)}...${winnerData.walletAddress.slice(-4)})!`)
      setShowRandomDrawModal(false)
      fetchWinners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Error generating random winner:', error)
      toast.error('Failed to generate random winner')
    } finally {
      setRandomDrawing(false)
    }
  }

  return (
    <div className="admin-lottery">
      <div className="admin-lottery__container">
        <div className="admin-lottery__header">
          <div>
            <h1 className="admin-lottery__title">Lottery Winners Management</h1>
            <p className="admin-lottery__subtitle">Manage and track lottery winners, prizes, and draw results</p>
          </div>
          <div className="admin-lottery__header-buttons">
            <button className="admin-lottery__random-button" onClick={openRandomDrawModal}>
              <FaDice /> Random Draw
            </button>
            <button className="admin-lottery__add-button" onClick={openAddModal}>
              <FaPlus /> Add New Winner
            </button>
          </div>
        </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading lottery winners...</p>
        </div>
      ) : winners.length === 0 ? (
        <div className="admin-empty-state">
          <p>No lottery winners found. Add your first winner!</p>
        </div>
      ) : (
        <>
          <div className="admin-lottery__table-container">
            <table className="admin-lottery__table">
              <thead>
                <tr>
                  <th>Date</th>
                <th>Wallet</th>
                <th>Username</th>
                <th>Prize</th>
                <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((winner) => (
                  <tr key={winner.id}>
                    <td>{formatDate(winner.date)}</td>
                    <td>{formatWalletAddress(winner.walletAddress)}</td>
                    <td>{winner.username || 'Anonymous'}</td>
                    <td>${winner.prize || 0}</td>
                    <td className="admin-lottery__actions">
                      <button 
                        className="admin-lottery__action-button admin-lottery__edit-button"
                        onClick={() => openEditModal(winner)}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="admin-lottery__action-button admin-lottery__delete-button"
                        onClick={() => winner.id && deleteWinner(winner.id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination and Page Size Controls */}
          <div className="admin-lottery__controls">
            <div className="admin-lottery__page-size">
              <label className="admin-lottery__page-size-label">Show:</label>
              <select 
                className="admin-lottery__page-size-select"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="admin-lottery__page-size-label">entries</span>
            </div>
            
            {pagination.pages > 1 && (
              <div className="admin-lottery__pagination">
                <button 
                  className="admin-lottery__pagination-button"
                  onClick={() => fetchWinners(1, pageSize)}
                  disabled={pagination.page <= 1}
                >
                  First
                </button>
                <button 
                  className="admin-lottery__pagination-button"
                  onClick={() => fetchWinners(pagination.page - 1, pageSize)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </button>
                
                <div className="admin-lottery__pagination-info">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </div>
                
                <button 
                  className="admin-lottery__pagination-button"
                  onClick={() => fetchWinners(pagination.page + 1, pageSize)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </button>
                <button 
                  className="admin-lottery__pagination-button"
                  onClick={() => fetchWinners(pagination.pages, pageSize)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="admin-lottery__modal">
          <div className="admin-lottery__modal-content">
            <div className="admin-lottery__modal-header">
              <h2 className="admin-lottery__modal-title">
                {editingWinner ? 'Edit Lottery Winner' : 'Add New Lottery Winner'}
              </h2>
              <button className="admin-lottery__modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            
            <form onSubmit={editingWinner ? updateWinner : addWinner}>
              <div className="admin-lottery__form-group">
                <label className="admin-lottery__form-label" htmlFor="date">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="admin-lottery__form-input"
                  value={editingWinner ? editingWinner.date as string : newWinner.date as string}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="admin-lottery__form-group">
                <label className="admin-lottery__form-label" htmlFor="walletAddress">
                  Wallet Address
                </label>
                <input
                  type="text"
                  id="walletAddress"
                  name="walletAddress"
                  className="admin-lottery__form-input"
                  value={editingWinner ? editingWinner.walletAddress : newWinner.walletAddress}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="admin-lottery__form-group">
                <label className="admin-lottery__form-label" htmlFor="username">
                  Username (optional)
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="admin-lottery__form-input"
                  value={editingWinner ? editingWinner.username || '' : newWinner.username || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="admin-lottery__form-group">
                <label className="admin-lottery__form-label" htmlFor="prize">
                  Prize
                </label>
                <input
                   type="number"
                   id="prize"
                   name="prize"
                   className="admin-lottery__form-input"
                   value={editingWinner ? editingWinner.prize || 0 : newWinner.prize || 0}
                   onChange={handleInputChange}
                   required
                   min="0"
                   step="0.01"
                 />
              </div>
              
              <div className="admin-lottery__form-actions">
                <button 
                  type="button" 
                  className="admin-lottery__form-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-lottery__form-submit"
                >
                  {editingWinner ? 'Update Winner' : 'Add Winner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Random Draw Modal */}
      {showRandomDrawModal && (
        <div className="admin-lottery__modal">
          <div className="admin-lottery__modal-content">
            <div className="admin-lottery__modal-header">
              <h2 className="admin-lottery__modal-title">
                🎲 Random Winner Draw
              </h2>
              <button className="admin-lottery__modal-close" onClick={closeRandomDrawModal}>
                &times;
              </button>
            </div>
            
            <form onSubmit={generateRandomWinner}>
              <div className="admin-lottery__form-group">
                <div className="admin-lottery__form-info">
                  This will randomly select a winner from all verified users in the system.
                </div>
              </div>
              
              <div className="admin-lottery__form-actions">
                <button 
                  type="button" 
                  className="admin-lottery__form-cancel"
                  onClick={closeRandomDrawModal}
                  disabled={randomDrawing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-lottery__form-submit admin-lottery__random-submit"
                  disabled={randomDrawing}
                >
                  {randomDrawing ? (
                    <>
                      <div className="admin-lottery__drawing-spinner"></div>
                      Drawing Winner...
                    </>
                  ) : (
                    <>
                      <FaDice /> Draw Random Winner
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}