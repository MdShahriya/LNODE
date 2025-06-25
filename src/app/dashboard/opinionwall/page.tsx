/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { FaThumbsUp, FaThumbsDown, FaCoins, FaPaperPlane, FaSpinner, FaPlus } from 'react-icons/fa';
import { likeOpinion, dislikeOpinion, saveUserInteraction } from '@/lib/utils/opinionInteractions';
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
  verification?: string;
}

export default function OpinionWall() {
  const { address } = useAccount();
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedOpinions, setExpandedOpinions] = useState<{[key: string]: boolean}>({});

  // Calculate credit cost based on priority (1-5 scale)
  const getCreditCost = (priorityLevel: number) => {
    const costMap = {
      1: 2,   // Low priority
      2: 4,   // Normal priority
      3: 6,   // Medium priority
      4: 8,   // High priority
      5: 10    // Urgent priority
    };
    return costMap[priorityLevel as keyof typeof costMap] || 1;
  };

  // Calculate character limit based on priority (1-5 scale)
  const getCharacterLimit = (priorityLevel: number) => {
    const limitMap = {
      1: 200,   // Low priority - 200 chars
      2: 400,   // Normal priority - 400 chars
      3: 600,   // Medium priority - 600 chars
      4: 800,   // High priority - 800 chars
      5: 1000   // Urgent priority - 1000 chars
    };
    return limitMap[priorityLevel as keyof typeof limitMap] || 200;
  };

  const creditCost = getCreditCost(priority);
  const characterLimit = getCharacterLimit(priority);

  // Define fetchOpinions before using it in useEffect
  const fetchOpinions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/opinions?page=1&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setOpinions(data.data);
      } else {
        console.error('Failed to fetch opinions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching opinions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [address]);

  // Fetch opinions
  useEffect(() => {
    fetchOpinions();
  }, [fetchOpinions]);

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
          title: title.trim(),
          content: content.trim(),
          creditCost,
          priority
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Your opinion has been submitted successfully!');
        setTitle('');
        setContent('');
        setPriority(1);
        fetchOpinions();
        fetchUserCredits();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
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
      const result = await likeOpinion(opinionId, address);
      
      // If the user has already liked this opinion, show a message
      if (result.hasLiked) {
        setError('You have already liked this opinion');
        // Clear the error message after 3 seconds
        setTimeout(() => setError(''), 3000);
      }
      
      // Update the opinions state with the new like/dislike counts
      setOpinions(prevOpinions =>
        prevOpinions.map(opinion =>
          opinion._id === opinionId
            ? { ...opinion, likes: result.likes, dislikes: result.dislikes }
            : opinion
        )
      );
      
      // Save the interaction in localStorage
      saveUserInteraction(opinionId, 'like');
    } catch (error: unknown) {
      console.error('Error liking opinion:', error);
      // Type check the error before accessing the message property
      if (error instanceof Error) {
        setError(error.message || 'Failed to like opinion');
      } else {
        setError('Failed to like opinion');
      }
      // Clear the error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDislike = async (opinionId: string) => {
    if (!address) {
      setError('Please connect your wallet to dislike opinions');
      return;
    }
    
    try {
      const result = await dislikeOpinion(opinionId, address);
      
      // If the user has already disliked this opinion, show a message
      if (result.hasDisliked) {
        setError('You have already disliked this opinion');
        // Clear the error message after 3 seconds
        setTimeout(() => setError(''), 3000);
      }
      
      // Update the opinions state with the new like/dislike counts
      setOpinions(prevOpinions =>
        prevOpinions.map(opinion =>
          opinion._id === opinionId
            ? { ...opinion, likes: result.likes, dislikes: result.dislikes }
            : opinion
        )
      );
      
      // Save the interaction in localStorage
      saveUserInteraction(opinionId, 'dislike');
    } catch (error: unknown) {
      console.error('Error disliking opinion:', error);
      // Type check the error before accessing the message property
      if (error instanceof Error) {
        setError(error.message || 'Failed to dislike opinion');
      } else {
        setError('Failed to dislike opinion');
      }
      // Clear the error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWalletAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Toggle expanded state for an opinion
  const toggleExpanded = (opinionId: string) => {
    setExpandedOpinions(prev => ({
      ...prev,
      [opinionId]: !prev[opinionId]
    }));
  };

  // Function to truncate text and add ellipsis
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    
    // Find the last space within the maxLength to avoid cutting words
    const lastSpaceIndex = text.substring(0, maxLength).lastIndexOf(' ');
    
    // If no space found or it's at the beginning, just cut at maxLength
    const cutIndex = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
    
    return text.substring(0, cutIndex) + '...';
  };

  return (
    <div className="chat-container">
      {address && userCredits < 10 && (
        <div className="floating-purchase-button" onClick={() => window.location.href = '/dashboard/credits'}>
          <FaPlus className="floating-purchase-icon" />
          <span>Buy Credits</span>
        </div>
      )}
      {/* Header */}
      <div className="chat-header">
        <h1>Opinion Wall</h1>
        <div className="user-info">
          {address && (
            <>
              <div className="credits-display">
                <FaCoins className="credit-icon" />
                <span>{userCredits} Credits</span>
              </div>
              <button 
                className="purchase-credits-button" 
                onClick={() => window.location.href = '/dashboard/credits'}
              >
                <FaPlus className="purchase-icon" />
                <span>Buy Credits</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages/Opinions Area */}
      <div className="messages-container">
        {loading ? (
          <div className="loading-container">
            <FaSpinner className="loading-icon spinner" />
            <p className="loading-text">Loading opinions...</p>
          </div>
        ) : opinions.length === 0 ? (
          <div className="empty-container">
            <div className="empty-icon">💭</div>
            <p className="empty-text">No opinions yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="opinions-list">
            {opinions.map((opinion) => (
              <div key={opinion._id} className="message-bubble">
                <div className="message-header">
                  <div className="author-info">
                    <img 
                      src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${opinion.walletAddress}`}
                      alt="Author Avatar"
                      className="author-avatar"
                    />
                    <span className="author-address">
                      {formatWalletAddress(opinion.walletAddress)}
                    </span>
                    {opinion.verification === 'verified' ? 
                    <div className="verified-badge">
                      <span>✓</span>
                    </div> : null}
                  </div>
                  <span className="message-time">{formatDate(opinion.timestamp)}</span>
                </div>
                
                <div className="message-content">
                  <h3 className="message-title">{opinion.title}</h3>
                  {opinion.content.length > 150 ? (
                    <>
                      <p className="message-text">
                        {expandedOpinions[opinion._id] ? opinion.content : truncateText(opinion.content)}
                      </p>
                      <button 
                        className="toggle-content-button"
                        onClick={() => toggleExpanded(opinion._id)}
                        aria-expanded={expandedOpinions[opinion._id]}
                      >
                        {expandedOpinions[opinion._id] ? 'See less ↑' : 'See more ↓'}
                      </button>
                    </>
                  ) : (
                    <p className="message-text">{opinion.content}</p>
                  )}
                </div>
                
                <div className="message-footer">
                  <div className="message-actions">
                    <button 
                      className="action-button like-button"
                      onClick={() => handleLike(opinion._id)}
                    >
                      <FaThumbsUp className="action-icon" />
                      <span>{opinion.likes}</span>
                    </button>
                    <button 
                      className="action-button dislike-button"
                      onClick={() => handleDislike(opinion._id)}
                    >
                      <FaThumbsDown className="action-icon" />
                      <span>{opinion.dislikes}</span>
                    </button>
                  </div>
                  <div className="credit-cost">
                    <FaCoins className="cost-icon" />
                    <span>{opinion.creditCost}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit} className="message-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Opinion title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
              disabled={submitting || !address}
            />
          </div>
          
          <div className="input-row">
            <textarea
              placeholder="Share your thoughts with the community..."
              value={content}
              onChange={(e) => {
                const newContent = e.target.value;
                if (newContent.length <= characterLimit) {
                  setContent(newContent);
                }
              }}
              className="message-input"
              disabled={submitting || !address}
              rows={3}
              maxLength={characterLimit}
            />
            <div 
              className={`character-counter ${
                content.length > characterLimit * 0.9 ? 'danger' : 
                content.length > characterLimit * 0.7 ? 'warning' : ''
              }`}
            >
              {content.length}/{characterLimit} characters
            </div>
            
            <div className="send-section">
              <div className="priority-selector">
                <label>Priority:</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="priority-select"
                  disabled={submitting || !address}
                >
                  <option value={1}>Low (2 credit, 200 chars)</option>
                  <option value={2}>Normal (4 credits, 400 chars)</option>
                  <option value={3}>Medium (6 credits, 600 chars)</option>
                  <option value={4}>High (8 credits, 800 chars)</option>
                  <option value={5}>Urgent (10 credits, 1000 chars)</option>
                </select>
              </div>
              
              <button 
                type="submit" 
                className="send-button"
                disabled={submitting || !address || !title.trim() || !content.trim() || userCredits < creditCost}
              >
                {submitting ? (
                  <FaSpinner className="spinner" />
                ) : (
                  <FaPaperPlane />
                )}
              </button>
            </div>
          </div>
        </form>
        
        {!address ? (
          <div className="connect-wallet-notice">
            Please connect your wallet to share opinions
          </div>
        ) : userCredits < creditCost && (
          <div className="low-credits-notice">
            <span>Not enough credits for this priority level</span>
            <button 
              className="purchase-credits-button-inline" 
              onClick={() => window.location.href = '/dashboard/credits'}
            >
              <FaPlus className="purchase-icon" />
              <span>Buy More Credits</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}