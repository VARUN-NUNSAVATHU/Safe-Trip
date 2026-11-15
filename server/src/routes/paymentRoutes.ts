import { Router, Request, Response } from 'express';
import { paymentService, SUBSCRIPTION_PLANS } from '../services/paymentService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/payments/plans
 * @desc    Get available subscription tiers & pricing
 * @access  Public
 */
router.get('/plans', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    plans: SUBSCRIPTION_PLANS,
  });
});

/**
 * @route   POST /api/payments/checkout
 * @desc    Create checkout session for Family Shield subscription
 * @access  Private
 */
router.post('/checkout', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).user?.id || 'guest_user';
  const { planId = 'plan_family_shield_plus' } = req.body;

  const session = paymentService.createCheckoutSession(userId, planId);
  res.status(200).json({
    success: true,
    session,
  });
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe/Payment gateway webhook notifications
 * @access  Public (Signature-Verified)
 */
router.post('/webhook', (req: Request, res: Response) => {
  const signature = (req.headers['stripe-signature'] as string) || 'test_bypass_sig';
  const payload = JSON.stringify(req.body);

  try {
    const result = paymentService.handleWebhookEvent(payload, signature);
    res.status(200).json({ received: true, result });
  } catch (err: any) {
    res.status(400).json({ error: 'Webhook verification failed', message: err.message });
  }
});

export default router;
