import React, {useEffect, useState} from 'react';
import Link from '@material-ui/core/Link';
import {useCryptid} from "../../../utils/Cryptid/cryptid";

export default function LabelValue({
                                     label,
                                     value,
                                     link = false,
                                     onClick,
                                     gutterBottom,
                                   }) {
  const {cryptidAccounts, ready} = useCryptid();

  const [displayValue, setDisplayValue] = useState();
  useEffect(() => {
    if (!ready || !value || !cryptidAccounts) setDisplayValue(value);

    const matchesSigner = cryptidAccounts.find((account) => account.activeSigningKey?.toBase58() === value)
    const matchesAccount = cryptidAccounts.find((account) => account.address?.toBase58() === value)

    if (matchesSigner) {
      setDisplayValue('Signer key ' + matchesSigner.activeSigningKeyAlias)
    } else if (matchesAccount) {
      setDisplayValue('Identity ' + matchesAccount.alias)
    } else {
      setDisplayValue(value)
    }
  }, [ready, cryptidAccounts, setDisplayValue])

  return (
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      <span className='text-gray-600 text-lg'>{label}{' '}</span>
      {link ? (
        <Link href="#" onClick={onClick}>
          {displayValue}
        </Link>
      ) : (
        <span style={{color: '#7B7B7B'}}>{value}</span>
      )}
    </td>
  );
}
