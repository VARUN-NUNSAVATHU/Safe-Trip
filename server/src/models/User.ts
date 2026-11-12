import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  pushToken?: string;
  homeZone: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
    address?: string;
  };
  settings: {
    autoPromptOnExit: boolean;
    alarmVolume: number;
    vibrationEnabled: boolean;
    autoNotifyDelaySeconds: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    pushToken: { type: String, default: '' },
    homeZone: {
      name: { type: String, default: 'Home' },
      latitude: { type: Number, default: 37.7749 },
      longitude: { type: Number, default: -122.4194 },
      radius: { type: Number, default: 150 }, // meters
      address: { type: String, default: '742 Evergreen Terrace, Springfield' },
    },
    settings: {
      autoPromptOnExit: { type: Boolean, default: true },
      alarmVolume: { type: Number, default: 85 },
      vibrationEnabled: { type: Boolean, default: true },
      autoNotifyDelaySeconds: { type: Number, default: 60 },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
