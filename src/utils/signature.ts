import { verifyMessage, id } from "ethers";
import { MandateCore } from "../interfaces/mandate";

/**
 * Reconstructs the message that the client or agent signed.
 * We hash the core to get a deterministic message strictly tied to the mandate intent.
 */
export function getMandateMessage(core: MandateCore): string {
    const serialized = JSON.stringify(core);
    return id(serialized); 
}

/**
 * Validates a signature matches the expected signer address
 */
export function verifySignature(message: string, signature: string, expectedSigner: string): boolean {
    try {
        const recovered = verifyMessage(message, signature);
        return recovered.toLowerCase() === expectedSigner.toLowerCase();
    } catch (e) {
        return false;
    }
}
