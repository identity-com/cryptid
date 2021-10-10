import * as React from 'react';
import {Accordion, AccordionDetails, AccordionSummary, Typography} from "@material-ui/core";
import {ExpandMoreRounded} from "@material-ui/icons";

const TransactionView:React.FC<{
  index: number
}> = ({
  index,
  children
                                    }) => (
  <div>
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreRounded/>}
        aria-controls={'transaction-' + index + '-view'}
        id={'transaction-' + index + '-view'}
      >
        <Typography>Transaction {index}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {children}
      </AccordionDetails>
    </Accordion>
  </div>
)

export default TransactionView;
