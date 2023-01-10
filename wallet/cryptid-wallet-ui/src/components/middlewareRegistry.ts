import { GenericMiddlewareParams, MiddlewareClient } from "../types/middleware";
import { PublicKey } from "@solana/web3.js";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { Middleware } from "../lib/Middleware";

type MiddlewareContext = {
  client: MiddlewareClient<GenericMiddlewareParams>;
  accounts: Middleware;
};
export class MiddlewareRegistry {
  // Map program IDs to middleware clients
  // Use string instead of PublicKey due to inconsistencies when comparing keys
  private middleware: Map<string, MiddlewareClient<GenericMiddlewareParams>>;

  constructor() {
    this.middleware = new Map();
  }

  public register<C extends GenericMiddlewareParams>(
    programId: PublicKey,
    middleware: MiddlewareClient<C>
  ): void {
    this.middleware.set(programId.toBase58(), middleware);
  }

  public getMiddlewareContexts(
    details: CryptidAccountDetails
  ): MiddlewareContext[] {
    return details.middlewares.map((middleware) => {
      const middlewareClient = this.middleware.get(
        middleware.programId.toBase58()
      );
      if (!middlewareClient) {
        throw new Error(
          `No middleware registered for program ID ${middleware.programId.toBase58()}`
        );
      }
      return { client: middlewareClient, accounts: middleware };
    });
  }

  // Encourage a singleton pattern for the middleware registry
  private static instance: MiddlewareRegistry;
  static get(): MiddlewareRegistry {
    if (!MiddlewareRegistry.instance) {
      MiddlewareRegistry.instance = new MiddlewareRegistry();
    }

    return MiddlewareRegistry.instance;
  }
}
