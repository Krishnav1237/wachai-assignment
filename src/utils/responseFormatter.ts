import { VerifierResult } from "../interfaces/verifier";

/**
 * Generates the structured payload representing the contents of a responseURI
 */
export function formatResponseURI(
    agentId: string, 
    primitive: string, 
    finalScore: number, 
    breakdown: VerifierResult[]
) {
    return {
        agentId,
        primitive,
        finalScore,
        breakdown,
        timestamp: Math.floor(Date.now() / 1000)
    };
}
