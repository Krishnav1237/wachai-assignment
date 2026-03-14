import { z } from "zod";
import { ValidationRequestPayload } from "../interfaces/validation";

const MandateCoreSchema = z.object({
  kind: z.string(),
  chainId: z.number(),
  deadline: z.number(),
  payload: z.record(z.string(), z.any()),
});


const MandateSchema = z.object({
  core: MandateCoreSchema,
  signatures: z.object({
    client: z.string(),
    agent: z.string(),
  }),
});

const ValidationRequestSchema = z.object({
  agentId: z.string(),
  primitive: z.string().regex(/^[a-z]+@\d+$/),
  mandate: MandateSchema,
  receipt: z.any(),
});

export class MandateParser {
  /**
   * Validates the payload structure and checks the deadline.
   * Throws if validation fails.
   */
  static parse(payload: unknown): ValidationRequestPayload {
    const parsed = ValidationRequestSchema.parse(payload);
    
    // Check deadline here instead of IntegrityVerifier for cleaner separation
    const currentTime = Math.floor(Date.now() / 1000);
    if (parsed.mandate.core.deadline < currentTime) {
        throw new Error(`Mandate is expired. Deadline: ${parsed.mandate.core.deadline}, Current: ${currentTime}`);
    }

    // Ensure primitive matches the mandate kind
    if (parsed.primitive !== parsed.mandate.core.kind) {
      throw new Error(`Payload primitive (${parsed.primitive}) does not match mandate kind (${parsed.mandate.core.kind})`);
    }

    return parsed;
  }
}
