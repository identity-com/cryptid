/* This example requires Tailwind CSS v2.0+ */
import { CheckCircleIcon, ChevronRightIcon, MailIcon } from '@heroicons/react/solid'
import {CryptidDetails} from "../Cryptid/CryptidDetails";
import {CryptidAccount} from "../../utils/Cryptid/cryptid";
import {ExoticComponent} from "react";
import TokenButtons from "./TokenButtons";

type Props = {}
const BalanceListView: React.FC<Props> = ({
                                            children
                                          }) => (
  <div className="bg-white shadow overflow-hidden sm:rounded-md">
    <TokenButtons/>
    <ul role="list" className="divide-y divide-gray-200">
      {children}
    </ul>
  </div>
)

export default BalanceListView;
