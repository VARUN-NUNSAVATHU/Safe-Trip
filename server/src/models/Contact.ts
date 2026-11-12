import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  relationship: 'Parent' | 'Mother' | 'Father' | 'Guardian' | 'Sibling' | 'Partner' | 'Friend' | 'Other';
  notifyOnDeparture: boolean;
  notifyOnArrival: boolean;
  isEmergencyContact: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    relationship: {
      type: String,
      enum: ['Parent', 'Mother', 'Father', 'Guardian', 'Sibling', 'Partner', 'Friend', 'Other'],
      default: 'Parent',
    },
    notifyOnDeparture: { type: Boolean, default: true },
    notifyOnArrival: { type: Boolean, default: true },
    isEmergencyContact: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
