
import {useCryptid} from "../utils/Cryptid/cryptid";
import { useWalletContext } from "../utils/wallet";
import { CryptidMiddleware } from "../components/Cryptid/CryptidMiddleware";

export default function MiddlewarePage() {
  const { selectedCryptidAccount } = useCryptid()

  return (
    <>
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {selectedCryptidAccount &&
              <CryptidMiddleware />}
            </ul>
          </div>
        </div>
      </div>

    </>
  );
}
