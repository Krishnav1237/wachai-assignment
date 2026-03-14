import { ValidationContext } from "../interfaces/validation";
import { Verifier, VerifierResult } from "../interfaces/verifier";

export class SwapVerifier implements Verifier {
    name = "SwapVerifier";

    async verify(context: ValidationContext): Promise<VerifierResult> {
        const mandatePayload = context.payload.mandate.core.payload;
        const receipt = context.payload.receipt;

        try {
            // Validate transaction hash exists in receipt
            if (!receipt.transactionHash) {
                return {
                    verifier: this.name,
                    score: 0,
                    notes: "Missing transaction hash in receipt",
                };
            }

            // In MVP, we assume the receipt contains a flattened 'events' array representing on-chain Swap events
            const swapEvent = receipt.events?.find((e: any) => e.name === "Swap");

            if (!swapEvent) {
                return {
                    verifier: this.name,
                    score: 20, // Failed to find execution context
                    notes: "Execution receipt does not contain a Swap event",
                    evidence: { receiptProvided: receipt }
                };
            }

            // Checks (with penalties)
            let score = 100;
            const notes = [];

            // ChainID check
            if (receipt.chainId && receipt.chainId !== context.payload.mandate.core.chainId) {
                score -= 30;
                notes.push("chainId mismatch");
            }

            if (swapEvent.tokenIn?.toLowerCase() !== mandatePayload.tokenIn?.toLowerCase()) {
                score -= 30;
                notes.push("tokenIn mismatch");
            }
            if (swapEvent.tokenOut?.toLowerCase() !== mandatePayload.tokenOut?.toLowerCase()) {
                score -= 30;
                notes.push("tokenOut mismatch");
            }
            
            // Note: JS BigInt operations handle precision
            const amountOut = BigInt(swapEvent.amountOut || "0");
            const minAmountOut = BigInt(mandatePayload.minAmountOut || "0");
            
            if (amountOut < minAmountOut) {
                score -= 40;
                notes.push(`amountOut (${amountOut}) is less than minAmountOut constraint (${minAmountOut})`);
            }

            // Normalize score
            score = Math.max(0, score);

            return {
                verifier: this.name,
                score,
                notes: notes.length > 0 ? notes.join(", ") : "Swap fully matched constraints",
                evidence: {
                    expected: { tokenIn: mandatePayload.tokenIn, tokenOut: mandatePayload.tokenOut, minAmountOut: minAmountOut.toString() },
                    actual: { tokenIn: swapEvent.tokenIn, tokenOut: swapEvent.tokenOut, amountOut: amountOut.toString() }
                }
            };
        } catch (e: any) {
            return {
                verifier: this.name,
                score: 0,
                notes: `Swap verify failed: ${e.message}`
            };
        }
    }
}
