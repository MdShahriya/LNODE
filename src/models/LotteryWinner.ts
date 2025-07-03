import mongoose, { Schema, Document } from 'mongoose'

export interface ILotteryWinner extends Document {
  date: Date
  walletAddress: string
  username: string | null
  prize: number
  createdAt: Date
  updatedAt: Date
}

const LotteryWinnerSchema: Schema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true // Add index for date queries
    },
    walletAddress: {
      type: String,
      required: true,
      index: true
    },
    username: {
      type: String,
      default: null
    },
    prize: {
      type: Number,
      required: true,
      default: 40
    }
  },
  { timestamps: true }
)

// Compound index for efficient date range queries with sorting
LotteryWinnerSchema.index({ date: -1, _id: 1 })

// Compound index for wallet address and date queries
LotteryWinnerSchema.index({ walletAddress: 1, date: -1 })

// Check if the model already exists to prevent overwriting during hot reloads
export default mongoose.models.LotteryWinner || mongoose.model<ILotteryWinner>('LotteryWinner', LotteryWinnerSchema)