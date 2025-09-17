import { AdminSettingsService } from './adminSettingsService';
import type { AdminSettingsData } from './adminSettingsService';

export interface DeliverySlot {
  date: string;
  time: string;
  available: boolean;
  reason?: string; // reason if not available
}

export class DeliveryService {
  /**
   * Get available delivery slots based on admin settings
   */
  static async getAvailableDeliverySlots(): Promise<DeliverySlot[]> {
    try {
      const settings = await AdminSettingsService.getSettings();
      
      if (!settings.deliverySettings.enabled) {
        return [];
      }

      return this.generateDeliverySlots(settings);
    } catch (error) {
      console.error('Error loading admin settings for delivery:', error);
      // Fallback to default delivery slots if admin settings fail
      return this.generateFallbackSlots();
    }
  }

  /**
   * Generate delivery slots based on admin settings
   */
  private static generateDeliverySlots(settings: AdminSettingsData): DeliverySlot[] {
    const slots: DeliverySlot[] = [];
    const today = new Date();
    const { deliverySettings, businessHours } = settings;

    // Calculate the earliest delivery date based on advance notice
    const earliestDate = new Date(today);
    earliestDate.setHours(earliestDate.getHours() + deliverySettings.advanceNoticeHours);

    // Generate slots for the configured number of days in advance
    for (let dayOffset = 0; dayOffset <= deliverySettings.maxDaysInAdvance; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      
      // Skip if this date is before the earliest allowed date
      if (date < earliestDate) {
        continue;
      }

      const dateStr = date.toISOString().split('T')[0];
      
      // Skip if this date is in the unavailable dates list
      if (deliverySettings.unavailableDates.includes(dateStr)) {
        continue;
      }

      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = date.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek] as keyof typeof businessHours;
      
      const dayHours = businessHours[dayName];
      
      // Skip if business is closed this day
      if (!dayHours.isOpen) {
        continue;
      }

      // Generate time slots for this day
      const daySlots = this.generateTimeSlotsForDay(
        dateStr,
        dayHours.openTime,
        dayHours.closeTime,
        deliverySettings.deliverySlotDuration,
        date,
        earliestDate
      );

      slots.push(...daySlots);
    }

    return slots;
  }

  /**
   * Generate time slots for a specific day
   */
  private static generateTimeSlotsForDay(
    dateStr: string,
    openTime: string,
    closeTime: string,
    slotDuration: number,
    date: Date,
    earliestDate: Date
  ): DeliverySlot[] {
    const slots: DeliverySlot[] = [];
    
    // Parse open and close times
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    // Create start and end times for the day
    const dayStart = new Date(date);
    dayStart.setHours(openHour, openMinute, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(closeHour, closeMinute, 0, 0);
    
    // Generate slots every slotDuration minutes
    const currentSlot = new Date(dayStart);
    
    while (currentSlot < dayEnd) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
      
      // Don't create slots that extend past closing time
      if (slotEnd > dayEnd) {
        break;
      }
      
      const timeStr = currentSlot.toTimeString().slice(0, 5); // HH:MM format
      
      // Check if this slot is in the past (for today only)
      const isAvailable = currentSlot >= earliestDate;
      const reason = !isAvailable ? 'Too soon to book' : undefined;
      
      slots.push({
        date: dateStr,
        time: timeStr,
        available: isAvailable,
        reason
      });
      
      // Move to next slot
      currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
    }
    
    return slots;
  }

  /**
   * Fallback delivery slots if admin settings can't be loaded
   */
  private static generateFallbackSlots(): DeliverySlot[] {
    const slots: DeliverySlot[] = [];
    const today = new Date();
    
    // Generate slots for next 7 days, 10 AM to 8 PM, 2-hour slots
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Default time slots (every 2 hours from 10 AM to 8 PM)
      const timeSlots = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      
      timeSlots.forEach(time => {
        slots.push({
          date: dateStr,
          time: time,
          available: Math.random() > 0.2 // 80% chance of being available
        });
      });
    }
    
    return slots;
  }

  /**
   * Check if a specific delivery slot is available
   */
  static async isSlotAvailable(date: string, time: string): Promise<boolean> {
    const slots = await this.getAvailableDeliverySlots();
    const slot = slots.find(s => s.date === date && s.time === time);
    return slot?.available || false;
  }

  /**
   * Get delivery slots grouped by date
   */
  static async getDeliverySlotsGroupedByDate(): Promise<{ [date: string]: DeliverySlot[] }> {
    const slots = await this.getAvailableDeliverySlots();
    const grouped: { [date: string]: DeliverySlot[] } = {};
    
    slots.forEach(slot => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    });
    
    return grouped;
  }
}
