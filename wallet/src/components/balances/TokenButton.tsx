import * as React from "react";
import {useState} from "react";
import {Tooltip} from "@material-ui/core";
import {Transition} from "@headlessui/react";

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
          "group relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        )}
        onClick={onClick}
      >
          <span className="hidden md:block pr-2">{label}</span>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    </Tooltip>
  )};
