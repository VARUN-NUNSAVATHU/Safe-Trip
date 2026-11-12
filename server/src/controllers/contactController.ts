import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Contact } from '../models/Contact.js';
import mongoose from 'mongoose';
import { dataStore } from '../services/dataStore.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || 'guest';
    let contacts: any[] = [];
    if (isDbConnected()) {
      try {
        contacts = await Contact.find({ userId });
        res.status(200).json({ success: true, data: contacts });
        return;
      } catch {}
    }

    // In-memory isolated store strictly scoped to userId
    contacts = dataStore.getUserContacts(userId);
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const addContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || 'guest';
    const { name, phone, email, relationship, notifyOnDeparture, notifyOnArrival } = req.body;

    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone are required.' });
      return;
    }

    let contact: any;
    if (isDbConnected()) {
      try {
        contact = await Contact.create({
          userId,
          name,
          phone,
          email: email || '',
          relationship: relationship || 'Parent',
          notifyOnDeparture: notifyOnDeparture ?? true,
          notifyOnArrival: notifyOnArrival ?? true,
        });
        res.status(201).json({ success: true, message: 'Contact saved', data: contact });
        return;
      } catch {}
    }

    // In-memory fallback: store strictly under userId
    contact = dataStore.addUserContact(userId, {
      name,
      phone,
      email: email || '',
      relationship: relationship || 'Parent',
      notifyOnDeparture: notifyOnDeparture ?? true,
      notifyOnArrival: notifyOnArrival ?? true,
      isEmergencyContact: false,
    });

    res.status(201).json({ success: true, message: 'Contact saved', data: contact });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const deleteContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const userId = req.user?.userId || 'guest';
    if (isDbConnected()) {
      try {
        await Contact.findOneAndDelete({ _id: id, userId });
      } catch {}
    }

    // In-memory fallback
    dataStore.deleteUserContact(userId, id);
    res.status(200).json({ success: true, message: 'Contact removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const updateContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const userId = req.user?.userId || 'guest';
    const { notifyOnDeparture, notifyOnArrival, isEmergencyContact } = req.body;

    if (isDbConnected()) {
      try {
        const contact = await Contact.findOneAndUpdate(
          { _id: id, userId },
          { notifyOnDeparture, notifyOnArrival, isEmergencyContact },
          { new: true }
        );
        if (contact) {
          res.status(200).json({ success: true, data: contact });
          return;
        }
      } catch {}
    }

    const updated = dataStore.updateUserContact(userId, id, {
      notifyOnDeparture,
      notifyOnArrival,
      isEmergencyContact,
    });

    res.status(200).json({ success: true, data: updated || { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
