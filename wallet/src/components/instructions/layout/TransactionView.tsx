import * as React from 'react';
import {Accordion, AccordionDetails, AccordionSummary, Typography} from "@material-ui/core";
import {ExpandMoreRounded} from "@material-ui/icons";
import {CheckCircleIcon, XCircleIcon} from "@heroicons/react/solid";

const TransactionView: React.FC<{
  index: number,
  meta: { failed: boolean | undefined, group: number, index: number, grouped: boolean }
}> = ({
        index,
        meta = {},
        children
      }) => (
    <div>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreRounded/>}
          aria-controls={'transaction-' + index + '-view'}
          id={'transaction-' + index + '-view'}
        >
          {meta.failed
            ? <XCircleIcon className="h-5 w-5 text-sm font-medium text-red-800"/>
            : <CheckCircleIcon className="h-5 w-5 text-sm font-medium text-green-800" style={{
              visibility: meta.failed === undefined ? 'hidden' : 'visible'
            }}/>
          }

          <Typography>
            Transaction {(meta.grouped && meta.index) ? (`${meta.group}.${meta.index}`) : (meta.group ?? index)} {meta.failed}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {children}
        </AccordionDetails>
      </Accordion>
    </div>
  );

export default TransactionView;
