import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const SimpleLightNodeAnimation = () => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [nodes, setNodes] = useState([
    { id: 1, x: 200, y: 150, isActive: true, isSyncing: false },
    { id: 2, x: 400, y: 100, isActive: false, isSyncing: false },
    { id: 3, x: 600, y: 200, isActive: true, isSyncing: true },
    { id: 4, x: 300, y: 300, isActive: true, isSyncing: false },
    { id: 5, x: 500, y: 350, isActive: false, isSyncing: false },
  ]);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          isActive: Math.random() > 0.3,
          isSyncing: Math.random() > 0.7,
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Set all nodes to offline when animation is disabled
  useEffect(() => {
    if (!isAnimating) {
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          isActive: false,
          isSyncing: false,
        }))
      );
    }
  }, [isAnimating]);

  const connections = [
    { from: 1, to: 2 },
    { from: 1, to: 4 },
    { from: 2, to: 3 },
    { from: 3, to: 5 },
    { from: 4, to: 5 },
  ];

  return (
    <div className="w-full h-screen relative overflow-hidden bg-transparent">
      {/* Animation Toggle Button */}
      <button
        onClick={() => setIsAnimating(!isAnimating)}
        className="absolute top-6 right-6 z-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 hover:bg-white/20 transition-all duration-300"
      >
        {isAnimating ? (
          <Pause className="w-6 h-6 text-white" />
        ) : (
          <Play className="w-6 h-6 text-white" />
        )}
      </button>

      <svg className="absolute inset-0 w-full h-full">
        {/* Connection lines */}
        {connections.map(({ from, to }, index) => {
          const fromNode = nodes.find(n => n.id === from);
          const toNode = nodes.find(n => n.id === to);
          if (!fromNode || !toNode) return null;
          
          const isActive = isAnimating && fromNode.isActive && toNode.isActive;
          
          return (
            <line
              key={index}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={isActive ? '#60a5fa' : '#6b7280'}
              strokeWidth="2"
              opacity={isActive ? 0.6 : 0.2}
              className={isActive ? 'animate-pulse' : ''}
            />
          );
        })}
        
        {/* Data packets - only show when animating */}
        {isAnimating && connections.map(({ from, to }, index) => {
          const fromNode = nodes.find(n => n.id === from);
          const toNode = nodes.find(n => n.id === to);
          if (!fromNode || !toNode || !fromNode.isActive || !toNode.isActive) return null;
          
          return (
            <circle
              key={`packet-${index}`}
              r="3"
              fill="#22d3ee"
              className="animate-pulse"
            >
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path={`M ${fromNode.x},${fromNode.y} L ${toNode.x},${toNode.y}`}
              />
            </circle>
          );
        })}
      </svg>
      
      {/* Nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          className="absolute"
          style={{
            left: node.x - 20,
            top: node.y - 20,
            width: '40px',
            height: '40px',
          }}
        >
          <div
            className={`
              w-full h-full rounded-full border-2 border-white/20
              ${!isAnimating 
                ? 'bg-gradient-to-br from-gray-500 to-gray-700 shadow-lg shadow-gray-500/20' 
                : node.isSyncing 
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/60 animate-pulse scale-110' 
                : node.isActive 
                ? 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg shadow-blue-400/50' 
                : 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg shadow-gray-400/20'
              }
              transition-all duration-500
            `}
          >
            {/* Pulse ring for active nodes - only when animating */}
            {isAnimating && node.isActive && (
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping" />
            )}
            
            {/* Node icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className={`
                  w-3 h-3 rounded-full
                  ${!isAnimating 
                    ? 'bg-gray-300/60' 
                    : node.isSyncing 
                    ? 'bg-white animate-bounce' 
                    : 'bg-white/80'
                  }
                `} 
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimpleLightNodeAnimation;