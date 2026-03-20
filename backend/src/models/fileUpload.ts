import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFileUpload extends Document {
  userId: Types.ObjectId;
  username: string;
  originalName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  expiresAt: Date;
  createdAt: Date;
}

const fileUploadSchema = new Schema<IFileUpload>(
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
    originalName: {
      type: String,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

fileUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
fileUploadSchema.index({ userId: 1 });

export default mongoose.model<IFileUpload>('FileUpload', fileUploadSchema);
