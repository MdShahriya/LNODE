import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';
import { ACTIVE_NETWORK } from '@/lib/contracts/network';
import NFTGeneratorABI from '@/abi/NFTGenarator.json';

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(ACTIVE_NETWORK.rpcUrl)
});

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, nftContractAddress } = await request.json();

    if (!walletAddress || !nftContractAddress) {
      return NextResponse.json(
        { error: 'Wallet address and NFT contract address are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.verification === 'verified') {
      return NextResponse.json(
        { message: 'User is already verified' },
        { status: 200 }
      );
    }

    try {
      // First, check if the contract exists by getting its bytecode
      const bytecode = await publicClient.getBytecode({
        address: nftContractAddress as `0x${string}`
      });

      if (!bytecode || bytecode === '0x') {
        console.error(`Contract not found at address: ${nftContractAddress}`);
        return NextResponse.json(
          { error: `NFT contract not deployed at address ${nftContractAddress}. Please verify the contract address.` },
          { status: 400 }
        );
      }

      // Check if user has minted an NFT using the hasMinted function
      const hasMinted = await publicClient.readContract({
        address: nftContractAddress as `0x${string}`,
        abi: NFTGeneratorABI.abi,
        functionName: 'hasMinted',
        args: [walletAddress as `0x${string}`]
      });

      if (!hasMinted) {
        return NextResponse.json(
          { error: 'No verification NFT found. You must mint an NFT first to verify your account.' },
          { status: 400 }
        );
      }

      // Update user verification status to verified
      const updateResult = await User.updateOne(
        { walletAddress: walletAddress.toLowerCase() },
        { 
          verification: 'verified',
          verifiedAt: new Date(),
          verificationMethod: 'nft',
          nftContractAddress: nftContractAddress.toLowerCase(),
          hasMintedNFT: true,
          $inc: { 
            points: 5000, // Verification bonus
            credits: 300 // Verification credit bonus
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Failed to update user verification status' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          message: 'Verification successful! You are now verified.',
          status: 'verified',
          hasMinted: true,
          bonusPoints: 5000,
          bonusCredits: 300
        },
        { status: 200 }
      );

    } catch (contractError) {
      console.error('Error reading NFT contract:', contractError);
      
      // If contract read fails, it might be due to network issues or invalid contract
      return NextResponse.json(
        { error: 'Failed to verify NFT ownership. Please check the contract address and try again.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error processing NFT verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const nftContractAddress = searchParams.get('nftContractAddress');

    if (!walletAddress || !nftContractAddress) {
      return NextResponse.json(
        { error: 'Wallet address and NFT contract address are required' },
        { status: 400 }
      );
    }

    try {
      // First, check if the contract exists by getting its bytecode
      const bytecode = await publicClient.getBytecode({
        address: nftContractAddress as `0x${string}`
      });

      if (!bytecode || bytecode === '0x') {
        console.error(`Contract not found at address: ${nftContractAddress}`);
        return NextResponse.json(
          { error: `NFT contract not deployed at address ${nftContractAddress}. Please verify the contract address.` },
          { status: 400 }
        );
      }

      // Check if user has minted an NFT using the hasMinted function
      const hasMinted = await publicClient.readContract({
        address: nftContractAddress as `0x${string}`,
        abi: NFTGeneratorABI.abi,
        functionName: 'hasMinted',
        args: [walletAddress as `0x${string}`]
      });

      return NextResponse.json(
        { 
          walletAddress,
          nftContractAddress,
          hasMinted: Boolean(hasMinted),
          hasNFT: Boolean(hasMinted)
        },
        { status: 200 }
      );

    } catch (contractError) {
      console.error('Error reading NFT contract:', contractError);
      return NextResponse.json(
        { error: 'Failed to check NFT balance' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error checking NFT balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}