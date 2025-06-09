'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import TwitterFollowCheck from '@/components/TwitterFollowCheck';
import Link from 'next/link';

export default function TwitterFollowPage() {
  const { isConnected } = useAccount();
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleVerificationSuccess = (isFollowing: boolean) => {
    setVerificationResult({
      success: isFollowing,
      message: isFollowing 
        ? 'Successfully verified that you are following TopayFoundation!' 
        : 'You are not following TopayFoundation. Please follow and try again.'
    });
  };

  const handleVerificationFailure = (error: string) => {
    setVerificationResult({
      success: false,
      message: `Verification failed: ${error}`
    });
    toast.error(`Verification failed: ${error}`);
  };

  return (
    <div className="twitter-follow-page">
      <div className="page-header">
        <h1>Twitter Follow Verification</h1>
        <p className="description">
          Verify that you are following the Topay Foundation on Twitter to unlock additional rewards and features.
        </p>
      </div>

      {!isConnected ? (
        <div className="connect-wallet-prompt">
          <p>Please connect your wallet to verify your Twitter follow status.</p>
        </div>
      ) : (
        <div className="verification-container">
          <TwitterFollowCheck 
            targetUsername="TopayFoundation"
            onVerificationSuccess={handleVerificationSuccess}
            onVerificationFailure={handleVerificationFailure}
          />

          {verificationResult && (
            <div className={`verification-result ${verificationResult.success ? 'success' : 'error'}`}>
              <p>{verificationResult.message}</p>
              {verificationResult.success && (
                <div className="next-steps">
                  <p>Great job! You&apos;ve successfully verified your Twitter follow status.</p>
                  <div className="action-buttons">
                    <Link href="/dashboard/rewards/tasks" className="action-button primary">
                      View Available Tasks
                    </Link>
                    <Link href="/dashboard/profile" className="action-button secondary">
                      Update Profile
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .twitter-follow-page {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 12px;
        }

        .description {
          color: #4a5568;
          font-size: 16px;
          line-height: 1.5;
        }

        .connect-wallet-prompt {
          background-color: #edf2f7;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          margin-top: 24px;
        }

        .connect-wallet-prompt p {
          color: #4a5568;
          font-size: 16px;
        }

        .verification-container {
          margin-top: 24px;
        }

        .verification-result {
          margin-top: 24px;
          padding: 16px;
          border-radius: 8px;
          background-color: #f7fafc;
          border: 1px solid #e2e8f0;
        }

        .verification-result.success {
          background-color: #f0fff4;
          border-color: #c6f6d5;
        }

        .verification-result.error {
          background-color: #fff5f5;
          border-color: #fed7d7;
        }

        .verification-result p {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 16px;
        }

        .next-steps {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .action-button {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          text-align: center;
          transition: all 0.2s ease;
        }

        .action-button.primary {
          background-color: #1da1f2;
          color: white;
        }

        .action-button.primary:hover {
          background-color: #1991db;
        }

        .action-button.secondary {
          background-color: #e2e8f0;
          color: #4a5568;
        }

        .action-button.secondary:hover {
          background-color: #cbd5e0;
        }
      `}</style>
    </div>
  );
}