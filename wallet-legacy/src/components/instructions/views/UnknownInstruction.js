import React from 'react';
import LabelValue from './LabelValue';
import InstructionView, { WritableIndicator } from "../layout/InstructionView";

export default function UnknownInstruction({ instruction, onOpenAddress, index, expanded, setExpanded, program }) {
  // console.log(instruction.accountMetas);

  return <InstructionView index={index} expanded={expanded} setExpanded={setExpanded} title={program} instruction={instruction}>
    {
      instruction.accountMetas &&
      instruction.accountMetas.map((accountMeta, index) =>
        (
          <tr key={index}>
            <LabelValue
              key={index + ''}
              label={(index + 1)}
              value={accountMeta.publicKey.toBase58()}
              link={true}
              onClick={() => onOpenAddress(accountMeta.publicKey.toBase58())}
            />
            <WritableIndicator accountMeta={accountMeta}/>
          </tr>
        ))
    }
    <tr>
      <LabelValue
        key="Data"
        label="Data"
        value={instruction.rawData}
        link={true}
        gutterBottom={true}
        onClick={() => {}
        }
      />
    </tr>
  </InstructionView>
}
