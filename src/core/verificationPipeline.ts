import { ValidationContext } from "../interfaces/validation";
import { Verifier, VerifierResult } from "../interfaces/verifier";

/**
 * Runs a verifier with a built-in timeout to prevent hanging implementations.
 */
async function runVerifierWithTimeout(verifier: Verifier, context: ValidationContext): Promise<VerifierResult> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<VerifierResult>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Verifier ${verifier.name} timed out after 2000ms.`)), 2000);
    });

    try {
        const result = await Promise.race([
            verifier.verify(context),
            timeoutPromise
        ]);
        return result;
    } finally {
        clearTimeout(timeoutHandle!);
    }
}

/**
 * The execution engine for running a sequence of verifiers.
 */
export class VerificationPipeline {
    /**
     * Executes the sequence of verifiers sequentially.
     * Short-circuits if the IntegrityVerifier yields a score of 0.
     */
    async executeVerifiers(context: ValidationContext, verifiers: Verifier[]): Promise<VerifierResult[]> {
        const results: VerifierResult[] = [];

        for (const verifier of verifiers) {
            try {
                const result = await runVerifierWithTimeout(verifier, context);
                results.push(result);

                // Early exit for integrity failure to save compute
                if (result.score === 0 && verifier.name === "IntegrityVerifier") {
                    break;
                }
            } catch (err: any) {
                // If a verifier blows up, log it as 0
                results.push({
                    verifier: verifier.name,
                    score: 0,
                    notes: `Verifier failed to execute: ${err.message}`
                });
                
                // If it was the IntegrityVerifier that exploded, short circuit.
                if (verifier.name === "IntegrityVerifier") {
                    break;
                }
            }
        }

        return results;
    }
}
