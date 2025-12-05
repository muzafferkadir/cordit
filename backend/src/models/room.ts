import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IActiveUser {
  userId: Types.ObjectId;
  username: string;
  joinedAt: Date;
  isVoiceActive?: boolean;
  livekitParticipantId?: string;
}

export interface IRoom extends Document {
  name: string;
  description?: string;
  isDefault: boolean;
  activeUsers: IActiveUser[];
  maxUsers?: number;
  livekitRoomName?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activeUserSchema = new Schema<IActiveUser>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isVoiceActive: {
      type: Boolean,
      default: false,
    },
    livekitParticipantId: {
      type: String,
    },
  },
  { _id: false },
);

const roomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    activeUsers: [activeUserSchema],
    maxUsers: {
      type: Number,
      default: 100,
    },
    livekitRoomName: {
      type: String,
      unique: true,
      sparse: true,
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

roomSchema.index({ isDefault: 1 });
roomSchema.index({ isDeleted: 1 });

export default mongoose.model<IRoom>('Room', roomSchema);
