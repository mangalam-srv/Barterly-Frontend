import { apiService } from './apiService';

export const geminiService = {
  generateDescription: async (productTitle: string): Promise<string> => {
    if (!productTitle.trim()) {
      return Promise.reject(new Error('Please provide a product title.'));
    }

    try {
      return await apiService.generateListingDescription(productTitle);
    } catch (error) {
      console.error('Error generating description through backend AI service:', error);
      throw new Error('Failed to generate description. Please try again or write your own.');
    }
  },
};
