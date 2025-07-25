import mongoose, { Document, Schema, Types } from 'mongoose';
import { IQuery, QueryType, AgentType } from '@/types/query';

interface IQueryDocument extends Omit<IQuery, '_id'>, Document {
    userId: Types.ObjectId;
  }

const querySchema = new Schema<IQueryDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  queryType: {
    type: String,
    enum: Object.values(QueryType),
    required: true
  },
  originalFilename: {
    type: String,
  },
  filePath: {
    type: String,
  },
  queryText: {
    type: String,
  },
  agentUsed: {
    type: String,
    enum: Object.values(AgentType),
  },
  result: {
    type: String,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  processingTime: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for efficient queries
querySchema.index({ userId: 1, createdAt: -1 });
querySchema.index({ status: 1 });

export default mongoose.model<IQueryDocument>('Query', querySchema);
