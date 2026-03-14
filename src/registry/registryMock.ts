import { EventEmitter } from "events";
import { ValidationEvent } from "../interfaces/validation";

/**
 * Simulates the ERC-8004 Validation Registry contract emitting and storing events.
 */
export class RegistryMock extends EventEmitter {
    private events: ValidationEvent[] = [];
    private currentBlockNumber = 18000000;

    /**
     * Emits a synthetic ValidationRequested event for the Router to pick up.
     * In a real environment, this payload is stored at `requestURI`.
     */
    simulateValidationRequest(requestURI: string, requestHash: string, payload: any) {
        this.emit("ValidationRequested", requestURI, requestHash, payload);
    }

    /**
     * Simulates submitting the final validation to the on-chain registry.
     */
    submitValidationResponse(
        agentId: string,
        requestId: string,
        score: number,
        responseURI: string,
        breakdown: any[]
    ) {
        this.currentBlockNumber++;
        const event: ValidationEvent = {
            agentId,
            requestId,
            score,
            breakdown,
            blockNumber: this.currentBlockNumber,
            timestamp: Math.floor(Date.now() / 1000),
            responseURI
        };
        this.events.push(event);
        
        // Let the system know action was completed (optional for MVP UI)
        this.emit("ValidationStored", event);
    }

    /**
     * Fetch synthetic history events for an agent
     */
    getAgentScores(agentId: string): ValidationEvent[] {
        const matching = this.events.filter(e => e.agentId.toLowerCase() === agentId.toLowerCase());
        // Return a deep clone to prevent external mutation of the registry's internal state
        return JSON.parse(JSON.stringify(matching));
    }
}

export const registryMock = new RegistryMock();
