/* This example requires Tailwind CSS v2.0+ */
import { CheckCircleIcon, ChevronRightIcon, MailIcon } from '@heroicons/react/solid'
import {CryptidDetails} from "../Cryptid/CryptidDetails";
import {CryptidAccount} from "../../utils/Cryptid/cryptid";
import {ExoticComponent} from "react";

type Props = {
  selectedCryptidAccount: CryptidAccount | null
  setSelectedCryptidAccount: (c: CryptidAccount) => void
  // balanceListItems: ExoticComponent[]
}
const BalanceListView: React.FC<Props> = ({
                                            selectedCryptidAccount,
                                            setSelectedCryptidAccount,
                                            children
                                          }) => (
  <div className="bg-white shadow overflow-hidden sm:rounded-md">
    <ul role="list" className="divide-y divide-gray-200">
      {selectedCryptidAccount &&
      <CryptidDetails cryptidAccount={selectedCryptidAccount} setSelectedCryptidAccount={setSelectedCryptidAccount}/>}
      {children}
    </ul>
  </div>
)

export default BalanceListView;
