import type { NextPage } from "next";
import Head from "next/head";
import { ActionsView } from "../views";

const Actions: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Cryptid Wallet</title>
        <meta
          name="description"
          content="Basic Functionality"
        />
      </Head>
      <ActionsView />
    </div>
  );
};

export default Actions;
