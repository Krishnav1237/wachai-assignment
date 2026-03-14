import { ValidationContext } from "./validation";

export interface VerifierResult {
  verifier: string;
  score: number;
  notes?: string;
  evidence?: Record<string, any>;
}

export interface Verifier {
  name: string;
  verify(context: ValidationContext): Promise<VerifierResult>;
}
