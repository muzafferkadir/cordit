import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  text: string;
  messageType: 'text' | 'system';
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ['text', 'system'],
      default: 'text',
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

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, isDeleted: 1 });

export default mongoose.model<IMessage>('Message', messageSchema);
