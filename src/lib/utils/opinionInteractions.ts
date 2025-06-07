/**
 * Utility functions for handling opinion interactions (likes, dislikes)
 */

/**
 * Like an opinion
 * @param opinionId The ID of the opinion to like
 * @param walletAddress The wallet address of the user liking the opinion
 * @returns Promise with the updated like/dislike counts and hasLiked status
 */
export async function likeOpinion(opinionId: string, walletAddress: string): Promise<{ likes: number; dislikes: number; hasLiked?: boolean }> {
  try {
    const response = await fetch(`/api/opinions/${opinionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'like',
        walletAddress
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // If the user has already liked this opinion, we'll get a 400 response
      // but we still want to return the current counts and hasLiked status
      if (data.data && data.data.hasLiked) {
        return data.data;
      }
    }
    
    return data.data;
  } catch (error) {
    console.error('Error liking opinion:', error);
    throw error;
  }
}

/**
 * Dislike an opinion
 * @param opinionId The ID of the opinion to dislike
 * @param walletAddress The wallet address of the user disliking the opinion
 * @returns Promise with the updated like/dislike counts and hasDisliked status
 */
export async function dislikeOpinion(opinionId: string, walletAddress: string): Promise<{ likes: number; dislikes: number; hasDisliked?: boolean }> {
  try {
    const response = await fetch(`/api/opinions/${opinionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'dislike',
        walletAddress
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // If the user has already disliked this opinion, we'll get a 400 response
      // but we still want to return the current counts and hasDisliked status
      if (data.data && data.data.hasDisliked) {
        return data.data;
      }
    }
    
    return data.data;
  } catch (error) {
    console.error('Error disliking opinion:', error);
    throw error;
  }
}

/**
 * Check if an opinion has been interacted with by the current user
 * Uses localStorage to track interactions
 * @param opinionId The ID of the opinion to check
 * @returns Object with hasLiked and hasDisliked flags
 */
export function getUserInteraction(opinionId: string): { hasLiked: boolean; hasDisliked: boolean } {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return { hasLiked: false, hasDisliked: false };
  }
  
  try {
    // Get stored interactions from localStorage
    const storedInteractions = localStorage.getItem('opinion_interactions');
    const interactions = storedInteractions ? JSON.parse(storedInteractions) : {};
    
    // Check if this opinion has been interacted with
    const opinionInteraction = interactions[opinionId] || { liked: false, disliked: false };
    
    return {
      hasLiked: opinionInteraction.liked,
      hasDisliked: opinionInteraction.disliked
    };
  } catch (error) {
    console.error('Error checking user interaction:', error);
    return { hasLiked: false, hasDisliked: false };
  }
}

/**
 * Save user interaction with an opinion
 * @param opinionId The ID of the opinion
 * @param interaction The type of interaction ('like' or 'dislike')
 */
export function saveUserInteraction(opinionId: string, interaction: 'like' | 'dislike'): void {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Get stored interactions from localStorage
    const storedInteractions = localStorage.getItem('opinion_interactions');
    const interactions = storedInteractions ? JSON.parse(storedInteractions) : {};
    
    // Update the interaction for this opinion
    interactions[opinionId] = {
      liked: interaction === 'like',
      disliked: interaction === 'dislike'
    };
    
    // Save back to localStorage
    localStorage.setItem('opinion_interactions', JSON.stringify(interactions));
  } catch (error) {
    console.error('Error saving user interaction:', error);
  }
}