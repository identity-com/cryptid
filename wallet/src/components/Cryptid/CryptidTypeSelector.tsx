

const CryptidTypeSelector = () => {

  const legend = 'Server size'
  const values = [
    {
      headline: 'New Key',
      subtext: 'Derives a new Key from your seedphrase',
    },
    {
      headline: 'Import Key',
      subtext: 'Allows you to paste a private Key',
    },
    {
      headline: 'Wallet Adapter',
      subtext: 'Use an external Wallet Adapter',
    },
    {
      headline: 'Import Cryptid Account',
      subtext: 'Import an existing account without an Key',
    }
  ]


  return (
    <fieldset>
    <legend className="sr-only">
      {legend}
    </legend>
    <div className="space-y-4">
      { values.map(v => (
        <label
          className="relative block rounded-lg border border-gray-300 bg-white shadow-sm px-6 py-4 cursor-pointer hover:border-gray-400 sm:flex sm:justify-between focus:outline-none">
          <input type="radio" name="server-size" value="Hobby" className="sr-only" aria-labelledby="server-size-0-label"
                 aria-describedby="server-size-0-description-0 server-size-0-description-1" />
          <div className="flex items-center">
            <div className="text-sm">
              <p id="server-size-0-label" className="font-medium text-gray-900">
                {v.headline}
              </p>
              <div id="server-size-0-description-0" className="text-gray-500">
                <p className="sm:inline">{v.subtext}</p>
                {/*<span className="hidden sm:inline sm:mx-1" aria-hidden="true">&middot;</span>*/}
                {/*<p className="sm:inline">160 GB SSD disk</p>*/}
              </div>
            </div>
          </div>
          {/*<div id="server-size-0-description-1" className="mt-2 flex text-sm sm:mt-0 sm:block sm:ml-4 sm:text-right">*/}
          {/*  <div className="font-medium text-gray-900">$40</div>*/}
          {/*  <div className="ml-1 text-gray-500 sm:ml-0">/mo</div>*/}
          {/*</div>*/}
          {/*<div className="absolute -inset-px rounded-lg border-2 pointer-events-none" aria-hidden="true"></div>*/}
        </label>
      ))}
    </div>
  </fieldset>
  )

}

export default CryptidTypeSelector
