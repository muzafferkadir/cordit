import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInviteCode extends Document {
  code: string;
  createdBy: Types.ObjectId;
  createdByUsername: string;
  expiresAt: Date;
  isUsed: boolean;
  usedBy?: Types.ObjectId;
  usedByUsername?: string;
  usedAt?: Date;
  maxUses: number;
  currentUses: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inviteCodeSchema = new Schema<IInviteCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByUsername: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    usedByUsername: {
      type: String,
    },
    usedAt: {
      type: Date,
    },
    maxUses: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentUses: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

inviteCodeSchema.index({ code: 1, isDeleted: 1 });
inviteCodeSchema.index({ expiresAt: 1, isUsed: 1, isDeleted: 1 });

export default mongoose.model<IInviteCode>('InviteCode', inviteCodeSchema);
