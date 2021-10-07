import React, { useRef } from 'react';
import { StyledProps, TextField, Theme, } from '@material-ui/core';
import CopyIcon from 'mdi-material-ui/ContentCopy';
import { makeStyles } from '@material-ui/core/styles';
import { useSnackbar } from 'notistack';
import QrcodeIcon from 'mdi-material-ui/Qrcode';
import QRCode from 'qrcode.react';
import DialogContent from '@material-ui/core/DialogContent';
import IconButton from '@material-ui/core/IconButton';
import Dialog from '@material-ui/core/Dialog';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    alignItems: 'baseline',
  },
}));

interface CopyableDisplayInterface {
  value?: unknown
  label?: React.ReactNode
  autoFocus?: boolean
  qrCode?: boolean | string
  helperText?: React.ReactNode
}


export default function CopyableDisplay({
  value,
  label,
  autoFocus,
  qrCode,
  helperText,
}: CopyableDisplayInterface) {
  const { enqueueSnackbar } = useSnackbar();
  const textareaRef = useRef<HTMLInputElement>();
  const classes = useStyles();
  const copyLink = () => {
    let textArea = textareaRef.current;
    if (textArea) {
      textArea.select();
      document.execCommand('copy');
      enqueueSnackbar(`Copied ${label}`, {
        variant: 'info',
        autoHideDuration: 2500,
      });
    }
  };

  // @ts-ignore
  return (
    <div className={classes.root}>
      <TextField
        inputRef={(ref) => (textareaRef.current = ref)}
        inputProps={{ readOnly: true }}
        multiline
        autoFocus={autoFocus}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        fullWidth
        helperText={helperText}
        label={label}
        spellCheck={false}
      />
      <IconButton onClick={copyLink}>
        <CopyIcon />
      </IconButton>
      {qrCode ? <Qrcode value={qrCode === true ? value : qrCode} /> : null}
    </div>
  );
}

const useQrCodeStyles = makeStyles((theme) => ({
  qrcodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
}));

function Qrcode({ value }) {
  const [showQrcode, setShowQrcode] = React.useState(false);
  const classes = useQrCodeStyles();

  return (
    <>
      <IconButton onClick={() => setShowQrcode(true)}>
        <QrcodeIcon />
      </IconButton>
      <Dialog open={showQrcode} onClose={() => setShowQrcode(false)}>
        <DialogContent className={classes.qrcodeContainer}>
          <QRCode value={value} size={256} includeMargin />
        </DialogContent>
      </Dialog>
    </>
  );
}
