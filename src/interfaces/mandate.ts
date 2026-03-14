export interface MandateCore {
  kind: string;
  chainId: number;
  deadline: number;
  payload: Record<string, any>;
}

export interface MandateSignatures {
  client: string;
  agent: string;
}

export interface Mandate {
  core: MandateCore;
  signatures: MandateSignatures;
}
