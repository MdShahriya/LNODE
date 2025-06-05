import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PointsHistory from '@/models/PointsHistory';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { fromWalletAddress, toWalletAddress, amount, description } = await request.json();
    
    if (!fromWalletAddress || !toWalletAddress) {
      return NextResponse.json(
        { error: 'Both sender and recipient wallet addresses are required' },
        { status: 400 }
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (fromWalletAddress.toLowerCase() === toWalletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot transfer credits to yourself' },
        { status: 400 }
      );
    }

    // Find the sender
    const sender = await User.findOne({ walletAddress: fromWalletAddress.toLowerCase() });
    
    if (!sender) {
      return NextResponse.json(
        { error: 'Sender not found' },
        { status: 404 }
      );
    }
    
    // Check if sender has enough credits
    if (sender.credits < amount) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Find the recipient
    const recipient = await User.findOne({ walletAddress: toWalletAddress.toLowerCase() });
    
    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }
    
    // Get client IP address from request
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
    
    const now = new Date();
    const senderCurrentBalance = sender.credits || 0;
    const senderNewBalance = senderCurrentBalance - amount;
    const recipientCurrentBalance = recipient.credits || 0;
    const recipientNewBalance = recipientCurrentBalance + amount;
    
    // Update sender's credits
    sender.credits = senderNewBalance;
    await sender.save();
    
    // Update recipient's credits
    recipient.credits = recipientNewBalance;
    await recipient.save();
    
    // Create points history record for sender
    const senderHistory = new PointsHistory({
      user: sender._id,
      walletAddress: sender.walletAddress,
      points: 0, // Not affecting points
      basePoints: 0,
      source: 'credits_transfer',
      subSource: 'sent',
      description: description || `Sent ${amount} credits to ${recipient.walletAddress}`,
      timestamp: now,
      multiplier: 1,
      transactionType: 'debit',
      balanceBefore: senderCurrentBalance,
      balanceAfter: senderNewBalance,
      isVerified: true,
      verifiedBy: 'system',
      verificationDate: now,
      metadata: {
        creditsTransferred: amount,
        recipientWallet: recipient.walletAddress,
        transferType: 'sent',
        apiVersion: '1.0'
      },
      ipAddress: clientIP
    });
    
    await senderHistory.save();
    
    // Create points history record for recipient
    const recipientHistory = new PointsHistory({
      user: recipient._id,
      walletAddress: recipient.walletAddress,
      points: 0, // Not affecting points
      basePoints: 0,
      source: 'credits_transfer',
      subSource: 'received',
      description: description || `Received ${amount} credits from ${sender.walletAddress}`,
      timestamp: now,
      multiplier: 1,
      transactionType: 'credit',
      balanceBefore: recipientCurrentBalance,
      balanceAfter: recipientNewBalance,
      isVerified: true,
      verifiedBy: 'system',
      verificationDate: now,
      metadata: {
        creditsTransferred: amount,
        senderWallet: sender.walletAddress,
        transferType: 'received',
        apiVersion: '1.0'
      },
      ipAddress: clientIP
    });
    
    await recipientHistory.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Credits transferred successfully',
      amount: amount,
      sender: {
        walletAddress: sender.walletAddress,
        newBalance: senderNewBalance
      },
      recipient: {
        walletAddress: recipient.walletAddress,
        newBalance: recipientNewBalance
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error transferring credits:', error);
    return NextResponse.json(
      { error: 'Failed to transfer credits' },
      { status: 500 }
    );
  }
}