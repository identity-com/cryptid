
import { FC } from "react";
import { SignMessage } from '../../components/SignMessage';
import { SendTransaction } from '../../components/SendTransaction';
import {ProposeTransaction} from '../../components/ProposeTransaction'
import { ExecuteTransaction } from "components/ExecuteTransaction";

export const ActionsView: FC = ({ }) => {

  return (
<div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#8B0000] to-[#FFCCCB]">
          Actions
        </h1>
        {/* CONTENT GOES HERE */}
        <div className="text-center">
          <SignMessage/>
          <SendTransaction />
          <ProposeTransaction/>
          <ExecuteTransaction/>
        </div>
      </div>
    </div>
  );
};
