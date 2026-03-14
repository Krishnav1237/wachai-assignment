import { id } from "ethers";
import stringify from "fast-json-stable-stringify";

/**
 * Deterministically strings and hashes a JSON payload.
 * Simulates how the requestURI contents might be hashed for `requestHash`.
 */
export function hashPayload(payload: any): string {
  const serialized = stringify(payload);
  return id(serialized); // keccak256
}
