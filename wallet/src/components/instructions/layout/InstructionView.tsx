import {Accordion, AccordionDetails, AccordionSummary, Typography} from "@material-ui/core";
import * as React from "react";
import {ExpandMoreRounded} from "@material-ui/icons";

const InstructionView:React.FC<{
  index: number,
  expanded: boolean
  setExpanded: (boolean) => void
}> = ({index, expanded, setExpanded, children}) => {
  const handleChange = () => () => {
    setExpanded(!expanded);
  };
  
  return (
    <Accordion expanded={expanded} onChange={handleChange}>
      <AccordionSummary
        expandIcon={<ExpandMoreRounded/>}
        aria-controls={'instruction-' + index + '-view'}
        id={'instruction-' + index + '-view'}
      >
        <Typography>Instruction {index}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          {children}
        </div>
      </AccordionDetails>
    </Accordion>
  )
}

export default InstructionView;
