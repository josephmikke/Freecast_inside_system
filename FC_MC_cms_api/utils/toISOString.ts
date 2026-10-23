export const toISOString = (date: any) => {
    // Check if the date is already a Date object
    if (date instanceof Date) {
      return date.toISOString().split('.')[0] + 'Z';
    }
  
    // Try to parse the date if it's a string or number
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('.')[0] + 'Z';
    }
  
    // If the date is invalid, return the current date as a fallback
    const currentDate = new Date();
    return currentDate.toISOString().split('.')[0] + 'Z';
  }