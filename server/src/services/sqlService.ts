/**
 * SafeTrip PostgreSQL Relational Query & Transaction Demonstration
 * Kalvium SQL (Postgres) Concepts:
 * - SQL JOINs (INNER JOIN User with Trips and Contacts)
 * - Filtering, ordering, grouping
 * - Atomic Multi-Table Transactions
 */

export interface RelationalTripReport {
  userId: string;
  userName: string;
  userEmail: string;
  totalTrips: number;
  totalDistanceKm: number;
  completedTripsCount: number;
}

export class PostgresService {
  /**
   * Demonstrates Raw SQL with INNER JOIN, WHERE filtering, GROUP BY, and ORDER BY
   */
  getAnalyticalReportQuery(minTrips: number = 1): string {
    return `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        COUNT(t.id) AS total_trips,
        COALESCE(SUM(t.distance_km), 0) AS total_distance_km,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_trips_count
      FROM users u
      INNER JOIN trips t ON u.id = t.user_id
      LEFT JOIN contacts c ON u.id = c.user_id
      WHERE t.start_time >= NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(t.id) >= ${minTrips}
      ORDER BY total_distance_km DESC
      LIMIT 50;
    `;
  }

  /**
   * Demonstrates ACID Transaction Pattern:
   * Updates trip status and simultaneously writes an immutable AlertLog record
   */
  async executeTripCompletionTransaction(
    tripId: string,
    arrivalAlertData: { recipient: string; channel: string; payload: string }
  ) {
    // Transaction step sequence simulation
    const steps = [
      `BEGIN TRANSACTION;`,
      `UPDATE trips SET status = 'COMPLETED', end_time = NOW() WHERE id = '${tripId}';`,
      `INSERT INTO alert_logs (id, trip_id, alert_type, recipient, channel, status, payload, created_at)
       VALUES (gen_random_uuid(), '${tripId}', 'ARRIVAL', '${arrivalAlertData.recipient}', '${arrivalAlertData.channel}', 'SENT', '${arrivalAlertData.payload}', NOW());`,
      `COMMIT;`,
    ];

    return {
      transactionStatus: 'COMMITTED',
      executedQueries: steps,
      tripId,
      timestamp: new Date(),
    };
  }
}

export const postgresService = new PostgresService();
