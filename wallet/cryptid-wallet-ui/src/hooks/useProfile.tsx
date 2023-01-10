import {CivicProfile, Profile} from "@civic/profile";
import {useWeb3React} from "@web3-react/core";
import {useEffect, useState} from "react";
import {useConnection} from "@solana/wallet-adapter-react";

export const useProfile = ():Profile|undefined => {
    const { account } = useWeb3React();
    const { connection } = useConnection();
    const [ profile, setProfile ] = useState<Profile>();

    useEffect(() => {
        if (account) {
            CivicProfile.get(account, { solana: { connection }}).then(setProfile);
        }
    }, [account, connection]);

    return profile;
}