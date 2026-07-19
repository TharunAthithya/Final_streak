export type Greeting = 'Good Morning' | 'Good Afternoon' | 'Good Evening' | 'Good Night';

/**
 * Returns a time-of-day greeting based on the local device time.
 * 
 * Rules:
 * - 05:00 to 11:59: Good Morning
 * - 12:00 to 16:59: Good Afternoon
 * - 17:00 to 20:59: Good Evening
 * - 21:00 to 04:59: Good Night
 */
export function getGreeting(date: Date = new Date()): Greeting {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'Good Morning';
  } else if (hours >= 12 && hours < 17) {
    return 'Good Afternoon';
  } else if (hours >= 17 && hours < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
}

/**
 * Calculates the calendar day offset from user's account creation date.
 * The account creation date is Day 1.
 * 
 * Uses midnight normalization in local time to resist timezone and DST transitions.
 */
export function getPromiseDay(createdAt: Date | string, today: Date = new Date()): number {
  const createdDate = new Date(createdAt);
  
  const startLocal = new Date(
    createdDate.getFullYear(),
    createdDate.getMonth(),
    createdDate.getDate()
  );
  
  const endLocal = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const diffMs = endLocal.getTime() - startLocal.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  
  return Math.max(1, diffDays + 1);
}
