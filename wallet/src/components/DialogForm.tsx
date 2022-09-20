import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import { useTheme } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { CryptidAccount } from "../utils/Cryptid/cryptid";
import { TransitionHandlerProps } from "@material-ui/core/transitions/transition";
import { DialogProps } from "@material-ui/core/Dialog/Dialog";

export default function DialogForm({
  open,
  onClose,
  onEnter,
  onSubmit,
  children,
  ...rest
}: DialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('xs'));

  return (
    <Dialog
      open={open}
      PaperProps={{
        component: 'form',
        onSubmit: (e) => {
          e.preventDefault();
          if (onSubmit) {
            onSubmit(e);
          }
        },
      }}
      onClose={onClose}
      onEnter={onEnter}
      fullScreen={fullScreen}
      {...rest}
    >
      {children}
    </Dialog>
  );
}
