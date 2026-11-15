import { Request, Response } from 'express';
import { Trip } from '../models/Trip.js';
import { dataStore } from '../services/dataStore.js';
import mongoose from 'mongoose';

/**
 * Controller demonstrating MongoDB Aggregation Pipelines
 * Kalvium NoSQL Concept: Aggregation pipelines, $match, $group, $sort, $project
 */
export const getTripAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id || 'guest';

    if (mongoose.connection.readyState === 1) {
      try {
        const pipeline: any[] = [
          {
            $match: {
              ...(userId && mongoose.Types.ObjectId.isValid(userId) ? { userId: new mongoose.Types.ObjectId(userId) } : {}),
              status: { $in: ['COMPLETED', 'ACTIVE'] },
            },
          },
          {
            $group: {
              _id: '$transportMode',
              totalTrips: { $sum: 1 },
              totalDistanceKm: { $sum: '$distanceKm' },
              avgDurationMinutes: { $avg: '$elapsedMinutes' },
              minDistanceKm: { $min: '$distanceKm' },
              maxDistanceKm: { $max: '$distanceKm' },
            },
          },
          {
            $sort: { totalTrips: -1 },
          },
          {
            $project: {
              _id: 0,
              transportMode: '$_id',
              totalTrips: 1,
              totalDistanceKm: { $round: ['$totalDistanceKm', 1] },
              avgDurationMinutes: { $round: ['$avgDurationMinutes', 1] },
              rangeKm: {
                min: '$minDistanceKm',
                max: '$maxDistanceKm',
              },
            },
          },
        ];

        const aggregateStats = await Trip.aggregate(pipeline);

        res.status(200).json({
          success: true,
          source: 'MongoDB Aggregation Pipeline',
          stats: aggregateStats,
        });
        return;
      } catch {}
    }

    // 2. High-performance In-Memory JSON Aggregation Equivalent
    const allTrips = dataStore.getUserTrips(userId);
    const modeGroups: Record<string, { count: number; totalKm: number; totalMinutes: number }> = {};

    allTrips.forEach((t) => {
      const mode = t.transportMode || 'Car';
      if (!modeGroups[mode]) {
        modeGroups[mode] = { count: 0, totalKm: 0, totalMinutes: 0 };
      }
      modeGroups[mode].count += 1;
      modeGroups[mode].totalKm += (t as any).distanceKm || 5.0;
      modeGroups[mode].totalMinutes += (t as any).elapsedMinutes || t.estimatedDurationMinutes || 15;
    });

    const fallbackStats = Object.keys(modeGroups).map((mode) => {
      const g = modeGroups[mode];
      return {
        transportMode: mode,
        totalTrips: g.count,
        totalDistanceKm: Number(g.totalKm.toFixed(1)),
        avgDurationMinutes: Number((g.totalMinutes / (g.count || 1)).toFixed(1)),
      };
    });

    res.status(200).json({
      success: true,
      source: 'JSON Store Aggregation Engine',
      stats: fallbackStats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Aggregation Failed',
      message: error.message,
    });
  }
};
