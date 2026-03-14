import { router } from "../src/router/router";
import { registryMock } from "../src/registry/registryMock";
import { runCLI } from "../src/cli/reputation";
import * as fs from "fs";
import * as path from "path";
import { hashPayload } from "../src/utils/hashing";
import { Wallet } from "ethers";
import { verifierManager } from "../src/core/verifierManager";
import { IntegrityVerifier } from "../src/verifiers/integrityVerifier";
import { SwapVerifier } from "../src/verifiers/swapVerifier";

async function main() {
    console.log("=== ERC-8004 MVP Demo ===\n");

    const mandateFile = fs.readFileSync(path.join(__dirname, "../examples/swapMandate.json"), "utf-8");
    const receiptFile = fs.readFileSync(path.join(__dirname, "../examples/swapReceipt.json"), "utf-8");
    
    const mandate = JSON.parse(mandateFile);
    const receipt = JSON.parse(receiptFile);
    
    // Register the standard primitive verifiers for the demonstration routing
    verifierManager.register("swap@1", new IntegrityVerifier());
    verifierManager.register("swap@1", new SwapVerifier());
    
    // Simulate Agent and Request IDs
    const agent = Wallet.createRandom();
    const requestId = "0xDemoRequestID8004";

    const payload = {
        agentId: agent.address,
        primitive: "swap@1",
        mandate: mandate,
        receipt: receipt
    };

    console.log("1. Simulating ValidationRequest Event...");
    const requestHash = hashPayload(payload);
    
    // Wait for router execution (sync via event loop in this mock environment)
    await router.handleRequest(requestId, requestHash, payload);

    console.log("\n2. Querying CLI for Latest Validation Output...");
    console.log("------------------------------------------");
    // Mimic the CLI `latest` command executing on the generated agent string
    runCLI(["node", "cli.ts", "latest", agent.address]);
    console.log("------------------------------------------");
    
    console.log("3. Demo complete!\n");
}

main().catch(console.error);
