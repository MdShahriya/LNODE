'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { FaThumbsUp, FaThumbsDown, FaUser, FaCoins, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { likeOpinion, dislikeOpinion, getUserInteraction, saveUserInteraction } from '@/lib/utils/opinionInteractions';
import './opinionwall.css';

interface Opinion {
  _id: string;
  title: string;
  content: string;
  walletAddress: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  creditCost: number;
}

export default function OpinionWall() {
  const { address } = useAccount();
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creditCost, setCreditCost] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Define fetchOpinions before using it in useEffect
  const fetchOpinions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/opinions?page=${currentPage}&limit=9`);
      const data = await response.json();
      
      if (data.success) {
        setOpinions(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching opinions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]); // Add currentPage as a dependency

  // Define fetchUserCredits before using it in useEffect
  const fetchUserCredits = useCallback(async () => {
    try {
      const response = await fetch(`/api/user?walletAddress=${address}`);
      const data = await response.json();
      
      if (data.user && data.user.credits !== undefined) {
        setUserCredits(data.user.credits);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  }, [address]); // Add address as a dependency

  // Fetch opinions
  useEffect(() => {
    fetchOpinions();
  }, [currentPage, fetchOpinions]);

  // Fetch user credits if wallet is connected
  useEffect(() => {
    if (address) {
      fetchUserCredits();
    }
  }, [address, fetchUserCredits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setError('Please connect your wallet to submit an opinion');
      return;
    }
    
    if (!title.trim() || !content.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      const response = await fetch('/api/opinions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          title,
          content,
          creditCost,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Your opinion has been submitted successfully!');
        setTitle('');
        setContent('');
        setCreditCost(1);
        fetchOpinions();
        fetchUserCredits();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      } else {
        setError(data.error || 'Failed to submit opinion');
      }
    } catch (error) {
      console.error('Error submitting opinion:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (opinionId: string) => {
    if (!address) {
      setError('Please connect your wallet to like opinions');
      return;
    }
    
    try {
      const { likes, dislikes } = await likeOpinion(opinionId);
      
      // Update the opinions state
      setOpinions(prevOpinions =>
        prevOpinions.map(opinion =>
          opinion._id === opinionId
            ? { ...opinion, likes, dislikes }
            : opinion
        )
      );
      
      // Save the interaction in localStorage
      saveUserInteraction(opinionId, 'like');
    } catch (error) {
      console.error('Error liking opinion:', error);
    }
  };

  const handleDislike = async (opinionId: string) => {
    if (!address) {
      setError('Please connect your wallet to dislike opinions');
      return;
    }
    
    try {
      const { likes, dislikes } = await dislikeOpinion(opinionId);
      
      // Update the opinions state
      setOpinions(prevOpinions =>
        prevOpinions.map(opinion =>
          opinion._id === opinionId
            ? { ...opinion, likes, dislikes }
            : opinion
        )
      );
      
      // Save the interaction in localStorage
      saveUserInteraction(opinionId, 'dislike');
    } catch (error) {
      console.error('Error disliking opinion:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatWalletAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="opinion-wall-container">
      <h1>Opinion Wall</h1>
      <p>
        Share your thoughts and opinions with the TOPAY community. Each submission costs only 1 credit 
        but helps shape the future of our platform.
      </p>
      
      {/* Opinion Form */}
      <div className="opinion-form">
        <h2 className="form-title">Submit Your Opinion</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title" className="form-label">Title</label>
            <input
              type="text"
              id="title"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your opinion"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="content" className="form-label">Your Opinion</label>
            <textarea
              id="content"
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts here..."
              required
            />
          </div>
          
          <div className="payment-info">
            <div className="payment-icon">
              <FaCoins />
            </div>
            <div className="payment-text">
              This submission will cost <span className="payment-amount">{creditCost} credits</span>.
              You currently have <span className="payment-amount">{userCredits} credits</span>.
            </div>
          </div>
          
          <button
            type="submit"
            className="submit-button"
            disabled={submitting || !address || userCredits < creditCost}
          >
            {submitting ? (
              <>
                <FaSpinner className="spinner" />
                Processing...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Submit Opinion
              </>
            )}
          </button>
        </form>
      </div>
      
      {/* Opinions List */}
      <h2 className="section-title">Community Opinions</h2>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-icon">
            <FaSpinner className="spinner" />
          </div>
          <div className="loading-text">Loading opinions...</div>
        </div>
      ) : opinions.length === 0 ? (
        <div className="empty-container">
          <div className="empty-text">No opinions have been shared yet. Be the first!</div>
        </div>
      ) : (
        <div className="opinions-list">
          {opinions.map((opinion) => {
            const { hasLiked, hasDisliked } = getUserInteraction(opinion._id);
            
            return (
              <div key={opinion._id} className="opinion-card">
                <div className="opinion-header">
                  <h3 className="opinion-title">{opinion.title}</h3>
                  <div className="opinion-date">{formatDate(opinion.timestamp)}</div>
                </div>
                
                <div className="opinion-content">{opinion.content}</div>
                
                <div className="opinion-footer">
                  <div className="opinion-author">
                    <span className="author-icon"><FaUser /></span>
                    {formatWalletAddress(opinion.walletAddress)}
                  </div>
                  
                  <div className="opinion-actions">
                    <button
                      className={`action-button ${hasLiked ? 'active' : ''}`}
                      onClick={() => handleLike(opinion._id)}
                    >
                      <FaThumbsUp className="action-icon" />
                      {opinion.likes}
                    </button>
                    
                    <button
                      className={`action-button ${hasDisliked ? 'active' : ''}`}
                      onClick={() => handleDislike(opinion._id)}
                    >
                      <FaThumbsDown className="action-icon" />
                      {opinion.dislikes}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`pagination-button ${currentPage === page ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}