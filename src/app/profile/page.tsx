'use client'

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import './profile.css';
import axios from 'axios';
import { IUser } from '@/lib/models/User';

interface ProfileData extends Omit<IUser, 'createdAt' | 'updatedAt'> {
  name: string;
  email: string;
  walletAddress: string;
  bio: string;
}

export default function Profile() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    walletAddress: '',
    bio: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    walletAddress: '',
    bio: ''
  });

  // Load profile data when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      // First try to fetch user data from the backend
      axios.get(`/api/get-profile?walletAddress=${address}`)
        .then((response: { data: { user: ProfileData } }) => {
          console.log('User profile fetched:', response.data.user);
          setProfileData(response.data.user);
          setFormData(response.data.user);
          // Update localStorage for offline access
          localStorage.setItem('profileData', JSON.stringify(response.data.user));
        })
        .catch((error: unknown) => {
          console.log('User not found in database, checking localStorage or creating new user');
          
          // If user not found in database, check localStorage
          const savedProfile = localStorage.getItem('profileData');
          if (savedProfile) {
            try {
              const parsedProfile = JSON.parse(savedProfile);
              // Ensure the wallet address matches the connected address
              if (parsedProfile.walletAddress === address) {
                setProfileData(parsedProfile);
                setFormData(parsedProfile);
                
                // If localStorage has a profile but backend doesn't, sync to backend
                if (error.response?.status === 404) {
                  axios.post('/api/create-user', parsedProfile)
                    .catch((createError) => {
                      console.error('Error syncing profile to backend:', createError);
                    });
                }
              } else {
                // Wallet address doesn't match, create new profile
                createNewProfile(address);
              }
            } catch (parseError) {
              console.error('Error parsing profile from localStorage:', parseError);
              createNewProfile(address);
            }
          } else {
            createNewProfile(address);
          }
        });
    }
  }, [isConnected, address]);
  
  // Helper function to create a new profile
  const createNewProfile = (walletAddress: string) => {
    // Initialize with connected wallet address
    const newProfile = {
      name: '',
      email: '',
      walletAddress,
      bio: ''
    };
    setProfileData(newProfile);
    setFormData(newProfile);

    // Send request to backend to create user
    axios.post('/api/create-user', newProfile)
      .then((response: { data: { user: ProfileData } }) => {
        console.log('User created:', response.data.user);
        // Update profile data with response from server if needed
        if (response.data.user) {
          setProfileData(response.data.user);
          setFormData(response.data.user);
          localStorage.setItem('profileData', JSON.stringify(response.data.user));
        }
      })
      .catch((createError: unknown) => {
        console.error('Error creating user:', createError);
      });
  };

  const { connectors } = useConnect();
  
  const handleConnectWallet = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      if (!formData.walletAddress) {
        alert('Wallet address is required');
        return;
      }
      
      // Send profile update to backend
      const response = await axios.put('/api/update-profile', formData);
      
      // Update profile data in state with the response from server
      if (response.data && response.data.user) {
        setProfileData(response.data.user);
        setFormData(response.data.user);
        
        // Save to localStorage for offline access
        localStorage.setItem('profileData', JSON.stringify(response.data.user));
      } else {
        // Fallback to form data if response doesn't contain user
        setProfileData(formData);
        localStorage.setItem('profileData', JSON.stringify(formData));
      }
      
      // Exit edit mode
      setIsEditing(false);
      
      // Update task completion if profile is complete
      if (formData.name && formData.email && formData.bio) {
        updateProfileTaskCompletion();
      }
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      
      // Display more specific error message if available
      if (error.response && error.response.data && error.response.data.error) {
        alert(`Failed to update profile: ${error.response.data.error}`);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    }
  };

  interface Task {
    title: string;
    completed: boolean;
    reward: number;
  }
  const updateProfileTaskCompletion = () => {
    // Get tasks from localStorage
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks) as Task[];
      
      // Find the profile completion task
      const updatedTasks = tasks.map((task: Task) => {
        if (task.title === 'Complete Profile' && !task.completed) {
          // Update user stats
          const savedStats = localStorage.getItem('userStats');
          if (savedStats) {
            const stats = JSON.parse(savedStats);
            const updatedStats = {
              ...stats,
              points: stats.points + task.reward,
              tasksCompleted: stats.tasksCompleted + 1
            };
            localStorage.setItem('userStats', JSON.stringify(updatedStats));
          }
          
          return { ...task, completed: true };
        }
        return task;
      });
      
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }
  };

  const isProfileComplete = () => {
    return Boolean(profileData.name && profileData.email && profileData.bio);
  };

  return (
    <div className="profile-container">
      <h1 className="profile-title">Profile</h1>
      
      {!isConnected ? (
        <div className="connect-wallet-container">
          <p>Connect your wallet to access your profile</p>
          <button 
            onClick={handleConnectWallet}
            className="connect-wallet-button"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="profile-content">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  required
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
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="walletAddress">Wallet Address</label>
                <input
                  type="text"
                  id="walletAddress"
                  name="walletAddress"
                  value={formData.walletAddress}
                  disabled
                  className="disabled-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself"
                  rows={4}
                  required
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="save-button">Save Profile</button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setFormData(profileData);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-view">
              <div className="profile-header">
                <div className="profile-status">
                  <span className={`status-indicator ${isProfileComplete() ? 'complete' : 'incomplete'}`}></span>
                  <span className="status-text">{isProfileComplete() ? 'Profile Complete' : 'Profile Incomplete'}</span>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                >
                  Edit Profile
                </button>
              </div>
              
              <div className="profile-details">
                <div className="detail-group">
                  <h3>Name</h3>
                  <p>{profileData.name || 'Not set'}</p>
                </div>
                
                <div className="detail-group">
                  <h3>Email</h3>
                  <p>{profileData.email || 'Not set'}</p>
                </div>
                
                <div className="detail-group">
                  <h3>Wallet Address</h3>
                  <p className="wallet-address">{profileData.walletAddress}</p>
                </div>
                
                <div className="detail-group">
                  <h3>Bio</h3>
                  <p>{profileData.bio || 'Not set'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}