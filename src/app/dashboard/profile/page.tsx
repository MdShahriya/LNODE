'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import './profile.css';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  walletAddress: string;
  points: number;
  credits: number;
  tasksCompleted: number;
  uptime: number;
  sessions: number;
  nodeStatus: string;
  joinedDate: string;
  streakCount: number;
  checkIns: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  verification?: string; // Only 'verified' or 'unverified'
  twitterUsername?: string;
  twitterVerified?: boolean;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    twitterUsername: ''
  });

  // Memoize the fetchProfileData function to avoid recreating it on every render
  const fetchProfileData = useCallback(async () => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // First try to fetch from the user API
      const response = await fetch(`/api/user?walletAddress=${address}&includeStats=true&includeHistory=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      
      const data = await response.json();
      
      // Map API data to our UserProfile interface
      const userProfile: UserProfile = {
          id: data.user?.id || '',
          walletAddress: data.user?.walletAddress || address, // Ensure wallet address is set from API or fallback to connected address
          username: data.user?.username || 'Anonymous User',
          email: data.user?.email || '',
          points: data.user?.points || 0,
          credits: data.user?.credits || 0,
          tasksCompleted: data.user?.tasksCompleted || 0,
          uptime: data.user?.uptime || 0,
          sessions: data.user?.totalSessions || 0,
          nodeStatus: data.user?.nodeStatus ? 'active' : 'inactive',
          joinedDate: data.user?.createdAt || new Date().toISOString(),
          streakCount: data.user?.currentStreak || 0,
          checkIns: data.user?.totalCheckIns || 0,
          dailyEarnings: 0, // Will be updated from daily-earnings API
          weeklyEarnings: 0,
          monthlyEarnings: 0,
          verification: data.user?.verification || 'unverified',
      };
      
      // Now fetch today's earnings for more accurate data
      try {
        const today = new Date().toISOString().split('T')[0];
        const earningsResponse = await fetch(`/api/user/daily-earnings?walletAddress=${address}&date=${today}`);
        
        if (earningsResponse.ok) {
          const earningsData = await earningsResponse.json();
          if (earningsData.success && earningsData.stats) {
            userProfile.dailyEarnings = earningsData.stats.totalPoints || 0;
          }
        }
      } catch (earningsErr) {
        console.error('Error fetching daily earnings:', earningsErr);
        // Don't fail the whole profile fetch if just earnings fail
      }
      
      // Fetch session data for more accurate node status
      try {
        const sessionsResponse = await fetch(`/api/user/node-sessions?walletAddress=${address}&days=1`);
        
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          if (sessionsData.success && sessionsData.sessions) {
            // Check if any session is currently active (status === 'active' and no endTime)
            const hasActiveSession = sessionsData.sessions.some(
              (session: { status: string; endTime?: string }) => 
                session.status === 'active' && !session.endTime
            );
            userProfile.nodeStatus = hasActiveSession ? 'active' : 'inactive';
          }
        }
      } catch (sessionsErr) {
        console.error('Error fetching sessions:', sessionsErr);
        // Don't fail the whole profile fetch if just sessions fail
      }
      
      setProfile(userProfile);
      
      // Update form data with current profile values
      setFormData({
        username: userProfile.username !== 'Anonymous User' ? userProfile.username : '',
        email: userProfile.email,
        twitterUsername: userProfile.twitterUsername || ''
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data. Please try again.');
      setIsLoading(false);
    }
  }, [isConnected, address]);

  // Set up polling to fetch profile data every 10 seconds
  useEffect(() => {
    // Initial fetch
    fetchProfileData();
    
    // Set up polling interval (only if not editing or saving)
    const intervalId = setInterval(() => {
      if (!isEditing && !isSaving) {
        fetchProfileData();
      }
    }, 10000); // 10 seconds for more real-time updates
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchProfileData, isEditing, isSaving]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          username: formData.username,
          email: formData.email,
          twitterUsername: formData.twitterUsername
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      
      // Update the profile state with the new data
      if (data.user) {
        setProfile(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            username: data.user.username || prev.username,
            email: data.user.email || prev.email,
            verification: data.user.verification || prev.verification
          };
        });
      }
      
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to refresh profile data on demand
  const handleRefresh = () => {
    fetchProfileData();
    toast.success('Profile data refreshed');
  };

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <div className="profile-container">
        <div className="profile-not-connected">
          <p>Please connect your wallet to view your profile.</p>
          <appkit-button balance='hide' />
        </div>
      </div>
    );
  }

  // If loading and no profile data yet, show loading state
  if (isLoading && !profile) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  // If error and no profile data, show error state
  if (error && !profile) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>{error}</p>
          <button onClick={fetchProfileData} className="profile-button">Try Again</button>
        </div>
      </div>
    );
  }

  // Format wallet address for display (0x1A2B3B...VS263 format from image)
  const formatDisplayAddress = (address: string) => {
    if (!address) return '';
    const prefix = address.substring(0, 8);
    const suffix = address.substring(address.length - 5);
    return `${prefix}...${suffix}`.toUpperCase();
  };

  return (
    <div className="profile-container">
      {/* Show error toast if there's an error but we have profile data */}
      {error && profile && toast.error(error)}
      
      {isEditing ? (
        <div className="profile-edit">
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled={isSaving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="twitterUsername">X Username</label>
              <input
                type="text"
                id="twitterUsername"
                name="twitterUsername"
                value={formData.twitterUsername}
                onChange={handleInputChange}
                placeholder="Enter your X username (without @)"
                disabled={isSaving}
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="profile-button save-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="profile-button cancel-button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="profile-view-new">
          {/* User Info Section */}
          <div className="user-info-section">
            <div className="user-avatar">
              {profile?.walletAddress ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  width={100}
                  height={100}
                  src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${profile.walletAddress}`} 
                  alt="User Avatar" 
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder"></div>
              )}
            </div>
            
            <div className="user-details">
              <div className="user-name-container">
                <h2 className="user-name">{profile?.username || 'USER'}</h2>
                {profile?.verification ==='verified'? 
                <div className="verified-badge">
                  <span>✓</span>
                </div> : null}
              </div>
              
              <p className="user-wallet">{formatDisplayAddress(profile?.walletAddress || '')}</p>
              
              <p className="user-email">EMAIL: {profile?.email || 'USER@EXAMPLE.COM'}</p>
              
              {profile?.twitterUsername && (
                <p className="user-twitter">X: @{profile.twitterUsername}</p>
              )}
              
              <p className="member-since">member since {profile?.joinedDate ? new Date(profile.joinedDate).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'DD/MM/YYYY'}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="profile-actions-new">
            <button 
              onClick={() => setIsEditing(true)} 
              className="edit-button-new"
              disabled={isLoading}
            >
              Edit
            </button>
            
            {profile?.verification !== 'verified' && (
              <button 
                onClick={() => router.push('/dashboard/profile/verify')} 
                className="verify-button-new"
                disabled={isLoading}
              >
                Verify
              </button>
            )}
            
            <button 
              onClick={handleRefresh} 
              className="refresh-button-new"
              disabled={isLoading}
            >
              ↻
            </button>
          </div>
          
          {/* Stats Section */}
          <div className="stats-section">
            <div className="stat-box">
              <div className="stat-title">Total Points</div>
              <div className="stat-value">{(profile?.points || 0).toFixed(2)} pt</div>
            </div>
            
            <div className="stat-box">
              <div className="stat-title">Credits</div>
              <div className="stat-value">{profile?.credits || 0}</div>
            </div>
            
            <div className="stat-box">
              <div className="stat-title">Uptime</div>
              <div className="stat-value">{Math.floor((profile?.uptime || 0) / 3600)} h</div>
            </div>
            
            <div className="stat-box">
              <div className="stat-title">Status</div>
              <div className="stat-value status-indicator">
                <span className="status-dot" style={{ backgroundColor: profile?.nodeStatus === 'active' ? '#4CAF50' : '#FF5252' }}></span>
                {profile?.nodeStatus === 'active' ? 'active' : 'inactive'}
              </div>
            </div>
          </div>
          
          {/* Activity Statistics Section */}
          <div className="activity-section">
            <h3 className="section-title">ACTIVITY STATISTICS</h3>
            
            <div className="activity-boxes">
              <div className="activity-box">
                <div className="activity-title">TODAY&apos;S EARNING :</div>
                <div className="activity-value">{profile?.dailyEarnings ? profile.dailyEarnings.toFixed(2) : 0} POINTS</div>
              </div>
              
              <div className="activity-box">
                <div className="activity-title">CURRENT STREAK :</div>
                <div className="activity-value">{profile?.streakCount || 0} DAYS</div>
              </div>
              
              <div className="activity-box">
                <div className="activity-title">TASKS COMPLETED :</div>
                <div className="activity-value">{profile?.tasksCompleted || 0}</div>
              </div>
            </div>
          </div>
        </div>)}
      </div>
    );
}