import axios from 'axios';

class ZiinaService {
  constructor() {
    this.baseURL = process.env.ZIINA_BASE_URL || 'https://api.ziina.com/api/v1';
    this.apiToken = process.env.ZIINA_API_TOKEN;
    this.headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/payment-intents`,
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          metadata,
          capture_method: 'automatic',
        },
        { headers: this.headers }
      );

      return {
        success: true,
        paymentIntentId: response.data.id,
        clientSecret: response.data.client_secret,
        status: response.data.status,
        amount: response.data.amount / 100, // Convert back to dollars
      };
    } catch (error) {
      console.error('Ziina createPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/payment-intents/${paymentIntentId}`,
        { headers: this.headers }
      );

      return {
        success: true,
        paymentIntent: response.data,
      };
    } catch (error) {
      console.error('Ziina getPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/payment-intents/${paymentIntentId}/confirm`,
        {},
        { headers: this.headers }
      );

      return {
        success: true,
        paymentIntent: response.data,
      };
    } catch (error) {
      console.error('Ziina confirmPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Refund a payment
   */
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const response = await axios.post(
        `${this.baseURL}/refunds`,
        refundData,
        { headers: this.headers }
      );

      return {
        success: true,
        refund: response.data,
      };
    } catch (error) {
      console.error('Ziina createRefund error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event) {
    try {
      const { type, data } = event;

      switch (type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSuccess(data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailure(data.object);
        
        case 'payment_intent.canceled':
          return await this.handlePaymentCanceled(data.object);
        
        default:
          console.log(`Unhandled event type: ${type}`);
          return { success: true, handled: false };
      }
    } catch (error) {
      console.error('Ziina webhook handling error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent) {
    try {
      // Update booking status in your database
      const booking = await prisma.booking.update({
        where: { paymentIntentId: paymentIntent.id },
        data: {
          paymentStatus: 'PAID',
          gatewayReference: paymentIntent.id,
          updatedAt: new Date(),
        },
      });

      // Create payment transaction record
      await prisma.paymentTransaction.create({
        data: {
          bookingId: booking.id,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          status: 'PAID',
          gatewayResponse: paymentIntent,
        },
      });

      return { success: true, bookingId: booking.id };
    } catch (error) {
      console.error('Error handling payment success:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(paymentIntent) {
    try {
      await prisma.booking.update({
        where: { paymentIntentId: paymentIntent.id },
        data: {
          paymentStatus: 'FAILED',
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle payment cancellation
   */
  async handlePaymentCanceled(paymentIntent) {
    try {
      await prisma.booking.update({
        where: { paymentIntentId: paymentIntent.id },
        data: {
          paymentStatus: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error handling payment cancellation:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ZiinaService();