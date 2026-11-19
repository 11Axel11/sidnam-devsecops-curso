/**
 * Formats a date string to a user-friendly format (DD/MM/YYYY HH:MM)
 * @param dateString - The date string to format (ISO format)
 * @returns Formatted date string (DD/MM/YYYY HH:MM)
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid date
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original string if there's an error
  }
};
