import React, { ReactNode } from 'react';

interface BlockchainStepProps {
  number: number;
  children: ReactNode;
}

const BlockchainStep: React.FC<BlockchainStepProps> = ({ number, children }) => {
  return (
    <li className="blockchain-step">
      <span className="blockchain-block">{number}</span>
      <span>{children}</span>
    </li>
  );
};

export default BlockchainStep;
