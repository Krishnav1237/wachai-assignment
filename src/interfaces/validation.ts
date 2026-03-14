import { Mandate } from "./mandate";
import { VerifierResult } from "./verifier";

export interface ValidationRequestPayload {
  agentId: string;
  primitive: string;
  mandate: Mandate;
  receipt: any;
}

export interface ValidationContext {
  requestId: string;
  agentId: string;
  primitive: string;
  payload: ValidationRequestPayload;
}

export interface ValidationEvent {
  agentId: string;
  requestId: string;
  score: number;
  breakdown: VerifierResult[];
  blockNumber: number;
  timestamp: number;
  responseURI: string;
}
