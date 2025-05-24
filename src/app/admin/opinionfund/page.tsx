'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import './opinionfund.css'

type ProposalStatus = 'pending' | 'approved' | 'rejected'

interface OpinionFundProposal {
  id: string
  title: string
  description: string
  requestedAmount: number
  walletAddress: string
  submittedDate: string
  status: ProposalStatus
  category: string
  votesFor: number
  votesAgainst: number
}

export default function AdminOpinionFund() {
  const [activeTab, setActiveTab] = useState<ProposalStatus>('pending')
  const [proposals, setProposals] = useState<OpinionFundProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Omit<OpinionFundProposal, 'id' | 'submittedDate' | 'status' | 'votesFor' | 'votesAgainst'>>({ 
    title: '',
    description: '',
    requestedAmount: 0,
    walletAddress: '',
    category: ''
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Fetch proposals
  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true)
      // This would be replaced with an actual API call in a real implementation
      // const response = await fetch(`/api/admin/opinionfund?status=${activeTab}`)
      // const data = await response.json()
      // setProposals(data)
      
      // For now, we'll use mock data
      setTimeout(() => {
        const mockProposals: OpinionFundProposal[] = [
          {
            id: '1',
            title: 'Community Event Funding',
            description: 'Funding for organizing a community meetup to discuss TOPAY ecosystem.',
            requestedAmount: 500,
            walletAddress: '0x1234...5678',
            submittedDate: '2024-03-15',
            status: 'pending',
            category: 'Community',
            votesFor: 25,
            votesAgainst: 5
          },
          {
            id: '2',
            title: 'Educational Content Creation',
            description: 'Creating educational videos about blockchain technology and TOPAY.',
            requestedAmount: 750,
            walletAddress: '0x8765...4321',
            submittedDate: '2024-03-10',
            status: 'approved',
            category: 'Education',
            votesFor: 42,
            votesAgainst: 8
          },
          {
            id: '3',
            title: 'Marketing Campaign',
            description: 'Social media marketing campaign to increase awareness of TOPAY.',
            requestedAmount: 1000,
            walletAddress: '0xabcd...efgh',
            submittedDate: '2024-03-05',
            status: 'rejected',
            category: 'Marketing',
            votesFor: 15,
            votesAgainst: 30
          }
        ]
        
        setProposals(mockProposals.filter(p => p.status === activeTab))
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error fetching proposals:', error)
      toast.error('Failed to load proposals')
      setLoading(false)
    }
  }, [activeTab])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.walletAddress || !formData.category || formData.requestedAmount <= 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (editingId) {
        // Update existing proposal
        // This would be replaced with an actual API call in a real implementation
        // const response = await fetch(`/api/admin/opinionfund/${editingId}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // })
        // const updatedProposal = await response.json()
        
        // Mock update
        const updatedProposal: OpinionFundProposal = { 
          ...formData, 
          id: editingId,
          submittedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          votesFor: 0,
          votesAgainst: 0
        }
        
        setProposals(proposals.map(p => p.id === editingId ? updatedProposal : p))
        toast.success('Proposal updated successfully')
      } else {
        // Create new proposal
        // This would be replaced with an actual API call in a real implementation
        // const response = await fetch('/api/admin/opinionfund', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // })
        // const newProposal = await response.json()
        
        // Mock creation
        const newProposal: OpinionFundProposal = { 
          ...formData, 
          id: Date.now().toString(),
          submittedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          votesFor: 0,
          votesAgainst: 0
        }
        
        if (activeTab === 'pending') {
          setProposals([...proposals, newProposal])
        }
        
        toast.success('Proposal created successfully')
      }
      
      // Reset form
      setFormData({ 
        title: '',
        description: '',
        requestedAmount: 0,
        walletAddress: '',
        category: ''
      })
      setEditingId(null)
    } catch (error) {
      console.error('Error saving proposal:', error)
      toast.error('Failed to save proposal')
    }
  }

  // Handle edit proposal
  const handleEdit = (proposal: OpinionFundProposal) => {
    setFormData({
      title: proposal.title,
      description: proposal.description,
      requestedAmount: proposal.requestedAmount,
      walletAddress: proposal.walletAddress,
      category: proposal.category
    })
    setEditingId(proposal.id)
  }

  // Handle delete proposal
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return
    
    try {
      // This would be replaced with an actual API call in a real implementation
      // await fetch(`/api/admin/opinionfund/${id}`, {
      //   method: 'DELETE'
      // })
      
      // Mock deletion
      setProposals(proposals.filter(p => p.id !== id))
      toast.success('Proposal deleted successfully')
    } catch (error) {
      console.error('Error deleting proposal:', error)
      toast.error('Failed to delete proposal')
    }
  }

  // Handle approve proposal
  const handleApprove = async (id: string) => {
    try {
      // This would be replaced with an actual API call in a real implementation
      // await fetch(`/api/admin/opinionfund/${id}/approve`, {
      //   method: 'PUT'
      // })
      
      // Mock approval
      setProposals(proposals.filter(p => p.id !== id))
      toast.success('Proposal approved successfully')
    } catch (error) {
      console.error('Error approving proposal:', error)
      toast.error('Failed to approve proposal')
    }
  }

  // Handle reject proposal
  const handleReject = async (id: string) => {
    try {
      // This would be replaced with an actual API call in a real implementation
      // await fetch(`/api/admin/opinionfund/${id}/reject`, {
      //   method: 'PUT'
      // })
      
      // Mock rejection
      setProposals(proposals.filter(p => p.id !== id))
      toast.success('Proposal rejected successfully')
    } catch (error) {
      console.error('Error rejecting proposal:', error)
      toast.error('Failed to reject proposal')
    }
  }

  // Reset form
  const handleReset = () => {
    setFormData({ 
      title: '',
      description: '',
      requestedAmount: 0,
      walletAddress: '',
      category: ''
    })
    setEditingId(null)
  }

  // Change active tab
  const handleTabChange = (tab: ProposalStatus) => {
    setActiveTab(tab)
  }

  useEffect(() => {
    fetchProposals()
  }, [activeTab, fetchProposals])

  return (
    <div className="admin-opinionfund">
      <div className="admin-opinionfund__container">
        <h1 className="admin-opinionfund__title">Opinion Fund Management</h1>
        <p className="admin-opinionfund__subtitle">Manage community proposals for the Opinion Fund</p>

        <div className="admin-opinionfund__form">
          <h2 className="admin-opinionfund__form-title">
            {editingId ? 'Edit Proposal' : 'Create New Proposal'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-opinionfund__form-group">
              <label className="admin-opinionfund__form-label" htmlFor="title">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="admin-opinionfund__form-input"
                required
              />
            </div>

            <div className="admin-opinionfund__form-group">
              <label className="admin-opinionfund__form-label" htmlFor="description">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="admin-opinionfund__form-textarea"
                required
              />
            </div>

            <div className="admin-opinionfund__form-row">
              <div className="admin-opinionfund__form-col">
                <label className="admin-opinionfund__form-label" htmlFor="requestedAmount">
                  Requested Amount (TOPAY) *
                </label>
                <input
                  type="number"
                  id="requestedAmount"
                  name="requestedAmount"
                  value={formData.requestedAmount}
                  onChange={handleInputChange}
                  className="admin-opinionfund__form-input"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="admin-opinionfund__form-col">
                <label className="admin-opinionfund__form-label" htmlFor="category">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="admin-opinionfund__form-select"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="Community">Community</option>
                  <option value="Education">Education</option>
                  <option value="Development">Development</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Research">Research</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="admin-opinionfund__form-group">
              <label className="admin-opinionfund__form-label" htmlFor="walletAddress">
                Wallet Address *
              </label>
              <input
                type="text"
                id="walletAddress"
                name="walletAddress"
                value={formData.walletAddress}
                onChange={handleInputChange}
                className="admin-opinionfund__form-input"
                required
              />
            </div>

            <div className="admin-opinionfund__form-actions">
              <button
                type="button"
                onClick={handleReset}
                className="admin-button admin-button--secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-button admin-button--primary"
              >
                {editingId ? 'Update Proposal' : 'Create Proposal'}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-opinionfund__list">
          <h2 className="admin-opinionfund__list-title">Proposals</h2>
          
          <div className="admin-opinionfund__tabs">
            <div 
              className={`admin-opinionfund__tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => handleTabChange('pending')}
            >
              Pending
            </div>
            <div 
              className={`admin-opinionfund__tab ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => handleTabChange('approved')}
            >
              Approved
            </div>
            <div 
              className={`admin-opinionfund__tab ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => handleTabChange('rejected')}
            >
              Rejected
            </div>
          </div>
          
          {loading ? (
            <div className="admin-opinionfund__loading">
              <div className="admin-opinionfund__loading-spinner"></div>
              <p>Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <p>No {activeTab} proposals found.</p>
          ) : (
            <table className="admin-opinionfund__table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Requested Amount</th>
                  <th>Wallet Address</th>
                  <th>Submitted Date</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <td>{proposal.title}</td>
                    <td>{proposal.category}</td>
                    <td>{proposal.requestedAmount} TOPAY</td>
                    <td>{proposal.walletAddress}</td>
                    <td>{proposal.submittedDate}</td>
                    <td>
                      {proposal.votesFor} for / {proposal.votesAgainst} against
                    </td>
                    <td>
                      <div className="admin-opinionfund__table-actions">
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(proposal.id)}
                              className="admin-button admin-button--primary"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(proposal.id)}
                              className="admin-button admin-button--danger"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(proposal)}
                          className="admin-button admin-button--secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(proposal.id)}
                          className="admin-button admin-button--danger"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}