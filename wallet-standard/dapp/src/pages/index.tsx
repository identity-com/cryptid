import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Cryptid Wallet</title>
        <meta
          name="description"
          content="Cryptid Wallet"
        />
      </Head>
      <HomeView />
    </div>
  );
};

export default Home;
