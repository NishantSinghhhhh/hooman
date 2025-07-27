// backend/controllers/analyticsController.ts

import User from '../models/User';

export class AnalyticsController {
  
  /**
   * Update request count for a specific modality
   */
  static async updateRequestCount(
    userId: string, 
    modality: 'video' | 'audio' | 'document' | 'image'
  ): Promise<void> {
    try {
      console.log(`📊 Updating request count for user ${userId}, modality: ${modality}`);
      
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            [`analytics.requests.${modality}`]: 1,
            'analytics.totalRequests': 1
          },
          'analytics.lastUpdated': new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Request count updated successfully`);
    } catch (error) {
      console.error('❌ Error updating request count:', error);
      throw error;
    }
  }

  /**
   * Update token count for a specific modality
   */
  static async updateTokenCount(
    userId: string, 
    modality: 'video' | 'audio' | 'document' | 'image',
    tokenCount: number
  ): Promise<void> {
    try {
      console.log(`📊 Updating token count for user ${userId}, modality: ${modality}, tokens: ${tokenCount}`);
      
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            [`analytics.tokens.${modality}`]: tokenCount,
            'analytics.totalTokens': tokenCount
          },
          'analytics.lastUpdated': new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Token count updated successfully`);
    } catch (error) {
      console.error('❌ Error updating token count:', error);
      throw error;
    }
  }

  /**
   * Update both request and token count in one operation
   */
  static async updateUsage(
    userId: string, 
    modality: 'video' | 'audio' | 'document' | 'image',
    tokenCount: number = 0
  ): Promise<void> {
    try {
      console.log(`📊 Updating usage for user ${userId}, modality: ${modality}, tokens: ${tokenCount}`);
      
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            [`analytics.requests.${modality}`]: 1,
            [`analytics.tokens.${modality}`]: tokenCount,
            'analytics.totalRequests': 1,
            'analytics.totalTokens': tokenCount
          },
          'analytics.lastUpdated': new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Usage updated successfully`);
    } catch (error) {
      console.error('❌ Error updating usage:', error);
      throw error;
    }
  }
}