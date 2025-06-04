'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import DailyCheckIn from './check-in/page'
import TaskCenter from './tasks/page'
import Achievements from './achievements/page'
import './rewards.css'

// Tab types
type RewardTab = 'tasks' | 'achievements'

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<RewardTab>('tasks')

  // Change active tab
  const handleTabChange = (tab: RewardTab) => {
    setActiveTab(tab)
  }

  return (
    <div className="rewards-page">
      <div className="rewards-page__container">
        <motion.h1 
          className="rewards-page__title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Rewards Center
        </motion.h1>

        {/* Daily Check-in Section (Permanently Integrated) */}
        <motion.div
          className="rewards-page__check-in-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <DailyCheckIn />
        </motion.div>
        
        {/* Tabs for Tasks and Achievements */}
        <motion.div 
          className="rewards-page__tabs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div 
            className={`rewards-page__tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => handleTabChange('tasks')}
          >
            Task Center
          </div>
          <div 
            className={`rewards-page__tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => handleTabChange('achievements')}
          >
            Achievements
          </div>
        </motion.div>
        
        <motion.div 
          className="rewards-page__content"
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'tasks' && <TaskCenter />}
          {activeTab === 'achievements' && <Achievements />}
        </motion.div>
      </div>
    </div>
  )
}
