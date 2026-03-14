import { Verifier } from "../interfaces/verifier";

/**
 * Maintains a registry mapping primitives (e.g. 'swap@1') to an array of Verifiers.
 */
export class VerifierManager {
    private registry = new Map<string, Verifier[]>();

    /**
     * Registers a verifier to a specific primitive sequence.
     */
    register(primitive: string, verifier: Verifier) {
        if (!this.registry.has(primitive)) {
            this.registry.set(primitive, []);
        }
        this.registry.get(primitive)!.push(verifier);
    }

    /**
     * Gets the verifiers for a primitive, or an empty array if none.
     */
    getVerifiers(primitive: string): Verifier[] {
        return this.registry.get(primitive) || [];
    }
}

// Export a singleton instance for global module use
export const verifierManager = new VerifierManager();
