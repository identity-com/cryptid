import {Accordion, AccordionDetails, AccordionSummary, Typography} from "@material-ui/core";
import * as React from "react";
import {CreateOutlined, ExpandMoreRounded} from "@material-ui/icons";
import LabelValue from "../views/LabelValue";
import {PublicKey} from "@solana/web3.js";

export const WritableIndicator:React.FC<{
  accountMeta: { isWritable: boolean}
}> = ({accountMeta}) =>
  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
    {accountMeta.isWritable &&
    <CreateOutlined className='text-gray-400 w-6'/>}
  </td>;

const InstructionView:React.FC<{
  index: number
  expanded: boolean
  setExpanded: (boolean) => void
  title: string
  instruction: { programId: PublicKey },
  failed?: boolean
}> = (
  {
    index,
    expanded,
    setExpanded,
    title,
    instruction,
    children
  }) => {
  const handleChange = () => {
    setExpanded(!expanded);
  };

  return (
    <Accordion expanded={expanded} onChange={handleChange}>
      <AccordionSummary
        expandIcon={<ExpandMoreRounded/>}
        aria-controls={'instruction-' + index + '-view'}
        id={'instruction-' + index + '-view'}
      >
        <Typography>{index}: {title} Instruction</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Program
                    </th>
                    <th></th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr>
                    <LabelValue
                      key="Program"
                      label=""
                      value={instruction.programId?.toBase58()}
                      link={true}
                      gutterBottom={true}
                      onClick={() => {}
                      }
                    />
                  </tr>
                  <th scope="col" className="relative px-6 py-3">
                  </th>
                  </tbody>
                  <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Account
                    </th>
                    <th scope="col" className="relative px-6 py-3">

                    </th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {children}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  )
}

export default InstructionView;
