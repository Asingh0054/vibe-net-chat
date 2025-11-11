import { z } from 'zod';

// Connection code validation
export const connectionCodeSchema = z.string()
  .trim()
  .min(6, "Connection code must be at least 6 characters")
  .max(100, "Connection code must be less than 100 characters")
  .regex(/^[a-zA-Z0-9-_]+$/, "Connection code can only contain letters, numbers, hyphens, and underscores");

// Device ID validation
export const deviceIdSchema = z.string()
  .trim()
  .min(10, "Device ID is invalid")
  .max(200, "Device ID is too long");

// Peer name validation
export const peerNameSchema = z.string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(50, "Name must be less than 50 characters");

// Chat message validation
export const chatMessageSchema = z.string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(10000, "Message must be less than 10,000 characters");

// File validation
export const fileSchema = z.object({
  name: z.string().max(255, "Filename too long"),
  size: z.number().max(100 * 1024 * 1024, "File size must be less than 100MB"),
  type: z.string().max(100, "File type too long")
});

// WebRTC signal data validation (basic structure check)
export const signalDataSchema = z.object({
  type: z.string().optional(),
  sdp: z.string().optional(),
  candidate: z.any().optional()
}).passthrough(); // Allow other properties but validate structure

// Bluetooth message validation
export const bluetoothMessageSchema = z.union([
  z.string().max(10000, "Message too long"),
  z.instanceof(ArrayBuffer)
]);

// Type for validation result
type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Helper function to safely validate and sanitize
export function validateInput<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Validation failed" };
  }
}
