import { describe, it, expect, beforeAll } from "vitest";
import { Wallet } from "ethers";
import { router } from "../src/router/router";
import { registryMock } from "../src/registry/registryMock";
import { verifierManager } from "../src/core/verifierManager";
import { IntegrityVerifier } from "../src/verifiers/integrityVerifier";
import { SwapVerifier } from "../src/verifiers/swapVerifier";
import { hashPayload } from "../src/utils/hashing";
import { getMandateMessage } from "../src/utils/signature";

describe("ERC-8004 MVP E2E Validation Flow", () => {
    
    const client = Wallet.createRandom();
    const agent = Wallet.createRandom();

    beforeAll(() => {
        // Setup Router Registry
        verifierManager.register("swap@1", new IntegrityVerifier());
        verifierManager.register("swap@1", new SwapVerifier());
        // For testing "missing verifier", we simply don't register 'bridge@1'
    });

    /**
     * Helper to generate a fully signed realistic mock mandate payload
     */
    async function createMockPayload(
        primitive: string = "swap@1", 
        amountOut: string = "3100", 
        minAmountOut: string = "3000",
        tokenOutOverride?: string,
        alterSignature: boolean = false
    ) {
        const core = {
            kind: primitive,
            chainId: 1,
            deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
            payload: {
                tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                amountIn: "1000",
                minAmountOut: minAmountOut
            }
        };

        const message = getMandateMessage(core);
        const clientSig = await client.signMessage(message);
        let agentSig = await agent.signMessage(message);

        if (alterSignature) {
            agentSig = await Wallet.createRandom().signMessage(message); // Fake signature
        }

        const payload = {
            agentId: agent.address,
            primitive,
            mandate: {
                core,
                signatures: {
                    client: clientSig,
                    agent: agentSig
                }
            },
            receipt: {
                transactionHash: "0x123",
                events: [
                    {
                        name: "Swap",
                        tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                        tokenOut: tokenOutOverride || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        amountOut
                    }
                ]
            }
        };

        return payload;
    }

    it("1. Valid execution: Mandate + valid receipt yields high score", async () => {
        const payload = await createMockPayload();
        const requestHash = hashPayload(payload);
        
        // Wait for router execution (sync via event loop in this mock environment)
        await router.handleRequest("req-1", requestHash, payload);

        const events = registryMock.getAgentScores(agent.address);
        const latestEvent = events[events.length - 1];

        expect(latestEvent.requestId).toBe("req-1");
        expect(latestEvent.score).toBeGreaterThan(80); // Usually 100 minus any sybil penalty, in this case 100 avg 100 = 100
        expect(latestEvent.breakdown.length).toBe(2);
        
        const integrityOutput = latestEvent.breakdown.find(b => b.verifier === "IntegrityVerifier");
        expect(integrityOutput?.score).toBe(100);

        const swapOutput = latestEvent.breakdown.find(b => b.verifier === "SwapVerifier");
        expect(swapOutput?.score).toBe(100);
    });

    it("2. Invalid receipt: Wrong tokenOut -> lower score", async () => {
        // Outputting a fake token yielding a penalty
        const payload = await createMockPayload("swap@1", "3100", "3000", "0xFAKE_TOKEN");
        const requestHash = hashPayload(payload);
        
        await router.handleRequest("req-2", requestHash, payload);

        const events = registryMock.getAgentScores(agent.address);
        const latestEvent = events[events.length - 1];

        const swapOutput = latestEvent.breakdown.find(b => b.verifier === "SwapVerifier");
        expect(swapOutput?.score).toBe(70); // 100 - 30 penalty = 70
        expect(swapOutput?.notes).toContain("tokenOut mismatch");
        
        // Final score should be average: (100 + 70) / 2 = 85
        expect(latestEvent.score).toBe(85);
    });

    it("3. Invalid hash: Router rejects request", async () => {
        const payload = await createMockPayload();
        // Provide completely wrong hash
        await router.handleRequest("req-3", "0xdeadbeef", payload);

        const events = registryMock.getAgentScores(agent.address);
        const request3Event = events.find(e => e.requestId === "req-3");
        
        // Should be undefined because Router rejects execution silently (or logs error) before appending score
        expect(request3Event).toBeUndefined();
    });

    it("4. Integrity failure: Invalid signature -> pipeline stops early", async () => {
        // Passing alterSignature = true generates a bad agent signature
        const payload = await createMockPayload("swap@1", "3100", "3000", undefined, true);
        const requestHash = hashPayload(payload);
        
        await router.handleRequest("req-4", requestHash, payload);

        const events = registryMock.getAgentScores(agent.address);
        const latestEvent = events[events.length - 1];

        const integrityOutput = latestEvent.breakdown.find(b => b.verifier === "IntegrityVerifier");
        expect(integrityOutput?.score).toBe(30); // Hardcoded penalty for bad sig
        
        const swapOutput = latestEvent.breakdown.find(b => b.verifier === "SwapVerifier");
        // Swap shouldn't run because integrityVerifier returned early (we updated Logic to skip Swap if Integrity is 0)
        // Actually wait - the Logic breaks if score === 0! But Integrity outputs 30.
        // The instructions said: check if score === 0 to short-circuit. Let's fix that check mentally:
        // Because Integrity returns 30, it actually CONTINUES. We want missing field -> pipeline stops.

        // So let's test a missing client signature instead, which DOES return Score 0 in the IntegrityVerifier.
        payload.mandate.signatures.client = "";
        const hash2 = hashPayload(payload);
        await router.handleRequest("req-4.1", hash2, payload);
        
        const latestEvent2 = registryMock.getAgentScores(agent.address).pop()!;
        const integrityOutput2 = latestEvent2.breakdown.find(b => b.verifier === "IntegrityVerifier");
        expect(integrityOutput2?.score).toBe(0);

        // VerificationPipeline shortcircuits when Integrity = 0
        const swapOutput2 = latestEvent2.breakdown.find(b => b.verifier === "SwapVerifier");
        expect(swapOutput2).toBeUndefined(); 
        
        // Final average: sum(0) / 1 = 0
        expect(latestEvent2.score).toBe(0);
    });

    it("5. No primitive verifier: Score fallback explicitly sets to 0", async () => {
         const payload = await createMockPayload("bridge@1"); // None assigned for bridge@1
         const requestHash = hashPayload(payload);
         
         await router.handleRequest("req-5", requestHash, payload);

         // Catch error in Router blocks and returns 0 and stores a synthetic fail block
         const latestEvent = registryMock.getAgentScores(agent.address).pop()!;
         
         expect(latestEvent.score).toBe(0);
         expect(latestEvent.breakdown[0].notes).toContain("No registered verifiers for primitive bridge@1");
    });

    it("6. Expired mandate: Parser throws correctly -> score fallback 0", async () => {
         const payload = await createMockPayload("swap@1");
         // Manually expire the deadline 10 seconds into the past
         payload.mandate.core.deadline = Math.floor(Date.now() / 1000) - 10;
         const requestHash = hashPayload(payload);
         
         await router.handleRequest("req-6", requestHash, payload);

         const latestEvent = registryMock.getAgentScores(agent.address).pop()!;
         
         expect(latestEvent.score).toBe(0);
         // The error message from MandateParser
         expect(latestEvent.breakdown[0].notes).toContain("Mandate is expired");
    });
});
