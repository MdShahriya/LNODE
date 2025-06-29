'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import './leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  tasksCompleted: number;
  uptime: number;
}

export default function Leaderboard() {
  const { address, isConnected } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }

        const data = await response.json();
        // Extract the leaderboard array from the response
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) {
      fetchLeaderboard();
    }
  }, [isConnected]);

  // Helper function to truncate address
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Check if the row is for the current user
  const isCurrentUser = (rowAddress: string) => {
    return address && rowAddress.toLowerCase() === address.toLowerCase();
  };

  // Container variants for staggered children animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  // Row variants for individual row animations
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard__container">
        <motion.h1 
          className="leaderboard__title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Leaderboard
        </motion.h1>

        {!isConnected ? (
          <motion.div 
            className="leaderboard__empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            Please connect your wallet to view the leaderboard.
          </motion.div>
        ) : loading ? (
          <motion.div 
            className="leaderboard__loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Loading leaderboard data...
          </motion.div>
        ) : error ? (
          <motion.div 
            className="leaderboard__error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {error}
          </motion.div>
        ) : leaderboard.length === 0 ? (
          <motion.div 
            className="leaderboard__empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            No leaderboard data available yet.
          </motion.div>
        ) : (
          <motion.div 
            className="leaderboard__table-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <table className="leaderboard__table">
              <thead>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Points</th>
                  <th>Tasks</th>
                  <th>Uptime</th>
                </motion.tr>
              </thead>
              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {leaderboard.map((entry) => (
                  <motion.tr
                    key={entry.address}
                    className={`leaderboard__row ${isCurrentUser(entry.address) ? 'leaderboard__row--current' : ''}`}
                    variants={rowVariants}
                    whileHover={{ scale: 1.01 }}
                  >
                    <td>
                      <motion.div 
                        className={`leaderboard__avatar ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          width={40}
                          height={40}
                          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${entry.address}`} 
                          alt={`User ${entry.rank} Avatar`} 
                          className="avatar-image"
                        />
                      </motion.div>
                    </td>
                    <td>
                      <motion.span 
                        className="leaderboard__address"
                        whileHover={{ scale: 1.05 }}
                      >
                        {truncateAddress(entry.address)}
                      </motion.span>
                    </td>
                    <td>
                      <motion.span 
                        className="leaderboard__points"
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {entry.points}
                      </motion.span>
                    </td>
                    <td>
                      <span className="leaderboard__tasks">{entry.tasksCompleted}</span>
                    </td>
                    <td>
                      <span className="leaderboard__uptime">{entry.uptime}%</span>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
