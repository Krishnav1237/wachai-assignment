import { registryMock } from "../registry/registryMock";
import { MandateParser } from "../core/mandateParser";
import { hashPayload } from "../utils/hashing";
import { verifierManager } from "../core/verifierManager";
import { VerificationPipeline } from "../core/verificationPipeline";
import { ValidationContext } from "../interfaces/validation";
import { aggregateScores } from "../core/scoreAggregator";
import { adjustScore } from "../core/scoreAdjuster";
import { formatResponseURI } from "../utils/responseFormatter";

export class Router {
    private pipeline = new VerificationPipeline();

    constructor() {
        // Emulates Ethers listening to `contract.on('ValidationRequested', ...)`
        registryMock.on("ValidationRequested", this.handleRequest.bind(this));
    }

    /**
     * Entrypoint for processing a new validation request
     */
    async handleRequest(requestURI: string, requestHash: string, rawPayload: unknown) {
        const requestId = requestURI; 

        try {
            // 1. Parse exactly (Mandate schema, deadlines) BEFORE Hashing allows rejection of malformed junk
            const payload = MandateParser.parse(rawPayload);

            // 2. Verify Request Hash guarantees
            const computedHash = hashPayload(payload);
            if (computedHash !== requestHash) {
                console.error(`[Router] Request ${requestId} REJECTED: Invalid requestHash.`);
                return;
            }
            
            console.log(`\n[Router] Request ${requestId}`);
            console.log(`Primitive: ${payload.primitive}`);
            console.log(`Agent: ${payload.agentId}`);

            // 3. Construct Context
            const context: ValidationContext = {
                requestId,
                agentId: payload.agentId,
                primitive: payload.primitive,
                payload
            };

            // 4. Fetch Verifiers for Primitive
            const verifiers = verifierManager.getVerifiers(payload.primitive);
            if (verifiers.length === 0) {
                throw new Error(`No registered verifiers for primitive ${payload.primitive}`);
            }

            console.log(`Running verifiers: ${verifiers.map(v => v.name).join(", ")}`);

            // 5. Execute Pipeline Sequentially
            const verifierResults = await this.pipeline.executeVerifiers(context, verifiers);

            // 6. Aggregate
            const baseScore = aggregateScores(verifierResults);

            // 7. Adjust specific Reputation
            const finalScore = adjustScore(baseScore, context.agentId);

            console.log(`Final score: ${finalScore}`);

            // 8. Generate URI content simulating IFPS upload or standard mapping output
            const responseMetadata = formatResponseURI(context.agentId, context.primitive, finalScore, verifierResults);
            
            // Generate a fake CID string mimicking responseURI saving
            const responseURI = `ipfs://mockCID_${Date.now()}`;

            // 9. Submit validation to the Registry on-chain
            registryMock.submitValidationResponse(
                context.agentId,
                requestId,
                finalScore,
                responseURI,
                verifierResults
            );

        } catch (err: any) {
            console.error(`[Router Error] Process failed for request ${requestId}: ${err.message}`);
            
            // Assuming rawPayload was loosely an object containing agentId, otherwise unknown
            const agentIdFallback = (typeof rawPayload === 'object' && rawPayload !== null && 'agentId' in rawPayload) ? (rawPayload as any).agentId : "unknown";

            registryMock.submitValidationResponse(
                agentIdFallback,
                requestId,
                0, // Fails everything
                "ipfs://failed",
                [{ verifier: "Router", score: 0, notes: err.message }]
            );
        }
    }
}

export const router = new Router();
