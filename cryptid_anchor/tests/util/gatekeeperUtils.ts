import {Provider} from "@project-serum/anchor";
import {
    GatekeeperNetworkService,
    GatekeeperService,
    SendableDataTransaction,
} from "@identity.com/solana-gatekeeper-lib";
import {Keypair, PublicKey, Transaction} from "@solana/web3.js";
import {
    addFeatureToNetwork,
    getFeatureAccountAddress,
    NetworkFeature,
    UserTokenExpiry
} from "@identity.com/solana-gateway-ts";

// The gateway protocol uses Borsh directly (rather than anchor)
// and network features is not yet fully integrated into the gateway SDKs
// so we have to build this value (for referring to a gatekeeper network feature)
// manually.
// Borsh imposes this odd structure for Enums
const expireFeature = new NetworkFeature({
    userTokenExpiry: new UserTokenExpiry({}),
});

export const sendGatewayTransaction = <T>(
    fn: () => Promise<SendableDataTransaction<T | null>>
) =>
    fn()
        .then((result) => result.send())
        .then(async (sendResult) => {
            const resultData = await sendResult.confirm();
            if (!resultData) throw new Error("Failed to execute transaction");
            return resultData;
        });

export const addGatekeeper = async (
    provider: Provider,
    gatekeeperNetwork: Keypair,
    gatekeeper: Keypair
): Promise<GatekeeperService> => {
    // create a new gatekeeper network (no on-chain tx here)
    const gknService = new GatekeeperNetworkService(
        provider.connection,
        gatekeeperNetwork
    );
    const gkService = new GatekeeperService(
        provider.connection,
        gatekeeperNetwork.publicKey,
        gatekeeper,
        {
            // by default, tokens will expire after a year
            defaultExpirySeconds: 60 * 60 * 24 * 365, // 1 year
        }
    );

    // add the civic gatekeeper to this network
    await sendGatewayTransaction(() =>
        gknService.addGatekeeper(gatekeeper.publicKey)
    );

    return gkService;
};

export const setExpireFeature = async (provider: Provider, gatekeeperNetwork: Keypair): Promise<string> => {
    // TODO add this to solana-gatekeeper-lib GatekeeperNetworkService
    const instruction = await addFeatureToNetwork(
        provider.publicKey,
        gatekeeperNetwork.publicKey,
        expireFeature
    );

    const transaction = new Transaction().add(instruction);
    await provider.sendAndConfirm(transaction, [gatekeeperNetwork]);
}

export const getExpireFeatureAddress = (gatekeeperNetwork: PublicKey): Promise<PublicKey> => getFeatureAccountAddress(expireFeature, gatekeeperNetwork)