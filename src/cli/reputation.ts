#!/usr/bin/env node
import { Command } from "commander";
import { registryMock } from "../registry/registryMock";
import { ValidationEvent } from "../interfaces/validation";

const program = new Command();

program
  .name("validator")
  .description("ERC-8004 Validator MVP CLI");

program.command("reputation")
  .description("Query the average reputation of an agent")
  .argument("<agentId>", "The agent's address")
  .action((agentId) => {
    const events = registryMock.getAgentScores(agentId);
    
    if (events.length === 0) {
      console.log(`Agent: ${agentId}`);
      console.log(`No validation records found.`);
      return;
    }

    const avg = events.reduce((acc, curr) => acc + curr.score, 0) / events.length;
    
    console.log(`Agent: ${agentId}\n`);
    console.log(`Average Score: ${Math.floor(avg)}`);
    console.log(`Total Validations: ${events.length}`);
    console.log(`Latest Score: ${events[events.length - 1].score}`);
  });

program.command("latest")
  .description("Query the specific breakdown of the latest validation event")
  .argument("<agentId>", "The agent's address")
  .action((agentId) => {
    const events = registryMock.getAgentScores(agentId);
    
    if (events.length === 0) {
      console.log(`Agent: ${agentId}\nNo validation records found.`);
      return;
    }

    const latest: ValidationEvent = events[events.length - 1];

    console.log(`Agent: ${agentId}\n`);
    console.log(`Latest Validation (Block ${latest.blockNumber})`);
    console.log(`-----------------------------------`);
    console.log(`Primitive: ${latest.breakdown.length > 0 ? (latest.breakdown[0] as any).primitive || 'swap@1' : 'unknown'}\n`);
    
    latest.breakdown.forEach((b) => {
      console.log(`${b.verifier}: ${b.score}`);
    });

    console.log(`\nFinal Score: ${latest.score}`);
    console.log(`responseURI: ${latest.responseURI}`);
  });

// Expose parse for testing, otherwise run directly
export function runCLI(args: string[]) {
    program.parse(args);
}

if (require.main === module) {
    program.parse(process.argv);
}
