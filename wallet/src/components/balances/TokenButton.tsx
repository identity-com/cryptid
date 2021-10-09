import * as React from "react";
import {Tooltip} from "@material-ui/core";

const classNames = (...classes) => classes.filter(Boolean).join(' ');

type TokenButtonProps = {
  label: string,
  Icon: (props: React.ComponentProps<'svg'>) => JSX.Element
  additionalClasses?: string,
  onClick: () => void
}
export const TokenButton: React.FC<TokenButtonProps> = ({label, Icon, onClick, additionalClasses = '' }) => {
  return (<Tooltip title={label} arrow>
      <button
        type="button"
        className={classNames(
          additionalClasses,
          "group relative inline-flex items-center px-2 py-2", 
          "border border-grey-300 bg-white text-sm font-medium text-red-800", 
          "hover:bg-red-50 rounded-md", 
          "focus:z-10 focus:outline-none focus:ring-1 focus:ring-red-800 focus:border-red-800"
        )}
        onClick={onClick}
      >
          <span className="hidden md:block pr-2">{label}</span>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    </Tooltip>
  )};
