import mongoose, { Schema, Document } from 'mongoose';

export type TripStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface ITrip extends Document {
  userId: string;
  startLocation: {
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
  startTime: Date;
  status: TripStatus;
  endTime?: Date;
  endLocation?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  currentLocation?: {
    name?: string;
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    timestamp?: Date;
  };
  contactsNotified?: Array<{
    name: string;
    phone: string;
    notifiedAt: Date;
    type: 'DEPARTURE' | 'ARRIVAL' | 'EMERGENCY';
  }>;
  estimatedDurationMinutes?: number;
  transportMode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    startLocation: {
      name: { type: String, default: 'Home' },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    destination: {
      name: { type: String, required: true },
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
      address: { type: String, default: '' },
    },
    startTime: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    endTime: { type: Date },
    endLocation: {
      name: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    currentLocation: {
      name: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      accuracy: { type: Number },
      timestamp: { type: Date },
    },
    contactsNotified: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        notifiedAt: { type: Date, default: Date.now },
        type: { type: String, enum: ['DEPARTURE', 'ARRIVAL', 'EMERGENCY'], default: 'DEPARTURE' },
      },
    ],
    estimatedDurationMinutes: { type: Number, default: 25 },
    transportMode: { type: String, default: 'Transit' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
