import { RadioGroup } from '@headlessui/react'
import { useCallback, useState } from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export type AddCryptidOrKeyType = 'newkey' | 'importkey' | 'adapterkey' | 'import'
export type AddCryptidOrKeyTextType = 'cryptid' | 'key'


interface AddCrytidOrTypeInfo {
  headline: string,
  subtext: string,
  type: AddCryptidOrKeyType
}

interface CryptidOrKeyTypeSelectorInterface {
  textType: AddCryptidOrKeyTextType
  initialType?: AddCryptidOrKeyType
  onChange: (t: AddCryptidOrKeyType) => void
}

const addCrytidTypes: (type: AddCryptidOrKeyTextType) => AddCrytidOrTypeInfo[] = (type) => ([
  {
    headline: 'Connect Wallet',
    subtext: type === 'cryptid' ? 'Connect Cryptid to an external wallet' : 'Use external wallet to add key',
    type: 'adapterkey',
  },
  {
    headline: 'New Key',
    subtext: 'Create a key and store in your browser',
    type: 'newkey',
  },
  {
    headline: 'Import Keypair',
    subtext: 'Paste an existing private key',
    type: 'importkey',
  },
  {
    headline: type === 'cryptid' ? 'Import Cryptid Account' : 'Import Address',
    subtext: type === 'cryptid' ? 'Import an existing account without a key' : 'Import address without a private key',
    type: 'import',
  }
])

const CryptidTypeSelector = ({textType, initialType, onChange} : CryptidOrKeyTypeSelectorInterface) => {

  const [selected, setSelected] = useState(addCrytidTypes(textType).find(i => i.type === initialType))
  const onChangeInternal = useCallback((info: AddCrytidOrTypeInfo) => {
    setSelected(info)
    onChange(info.type)
  }, [setSelected, onChange])

  return (
    <RadioGroup value={selected} onChange={onChangeInternal}>
      <RadioGroup.Label className="sr-only">Server size</RadioGroup.Label>
      <div className="space-y-4">
        {addCrytidTypes(textType).map((v) => (
          <RadioGroup.Option
            key={v.headline}
            value={v}
            className={({ active }) =>
              classNames(
                active ? 'ring-1 ring-offset-2 ring-indigo-500' : '',
                'relative block rounded-lg border border-gray-300 bg-white shadow-sm px-6 py-4 cursor-pointer hover:border-gray-400 sm:flex sm:justify-between focus:outline-none'
              )
            }
          >
            {({ active, checked  }) => (
              <>
                <div className="flex items-center">
                  <div className="text-sm">
                    <RadioGroup.Label as="p" className="font-medium text-gray-900">
                      {v.headline}
                    </RadioGroup.Label>
                    <RadioGroup.Description as="div" className="text-gray-500">
                      <p className="sm:inline">
                        {v.subtext}
                      </p>
                    {/*  </p>{' '}*/}
                    {/*  <span className="hidden sm:inline sm:mx-1" aria-hidden="true">*/}
                    {/*  &middot;*/}
                    {/*</span>{' '}*/}
                    {/*  <p className="sm:inline">{plan.disk}</p>*/}
                    </RadioGroup.Description>
                  </div>
                </div>
                {/*<RadioGroup.Description as="div" className="mt-2 flex text-sm sm:mt-0 sm:block sm:ml-4 sm:text-right">*/}
                {/*  <div className="font-medium text-gray-900">{plan.price}</div>*/}
                {/*  <div className="ml-1 text-gray-500 sm:ml-0">/mo</div>*/}
                {/*</RadioGroup.Description>*/}
                <div
                  className={classNames(
                    checked ? 'border-indigo-500' : 'border-transparent',
                    'absolute -inset-px rounded-lg border-2 pointer-events-none'
                  )}
                  aria-hidden="true"
                />
              </>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )

}

export default CryptidTypeSelector
