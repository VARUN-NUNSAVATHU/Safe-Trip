import mongoose, { Schema, Document } from 'mongoose';

export interface IDestination extends Document {
  userId: mongoose.Types.ObjectId | string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: 'College' | 'Work' | 'Gym' | 'Library' | 'Family' | 'Other';
  icon: string;
  estimatedMinutes: number;
  distanceKm: number;
  createdAt: Date;
  updatedAt: Date;
}

const DestinationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    category: {
      type: String,
      enum: ['College', 'Work', 'Gym', 'Library', 'Family', 'Other'],
      default: 'Other',
    },
    icon: { type: String, default: 'location-outline' },
    estimatedMinutes: { type: Number, default: 20 },
    distanceKm: { type: Number, default: 5.0 },
  },
  { timestamps: true }
);

export const Destination = mongoose.model<IDestination>('Destination', DestinationSchema);
