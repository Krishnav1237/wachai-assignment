import { VerifierResult } from "../interfaces/verifier";

/**
 * Pure function summing and averaging scores of the executed verifiers.
 */
export function aggregateScores(results: VerifierResult[]): number {
    if (results.length === 0) return 0;
    
    const total = results.reduce((acc, result) => acc + result.score, 0);
    return Math.floor(total / results.length);
}
