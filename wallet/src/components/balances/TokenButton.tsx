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
  const [ show, setShow] = useState<boolean>(false)
  return (<Tooltip title={label} arrow>
      <button
        type="button"
        className={classNames(
          additionalClasses,
          "transition-width transition-slowest ease group relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        )}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={onClick}
      >
        <Transition
          enter="transition ease-out duration-500"
          enterFrom="transform width-0 scale-95"
          enterTo="transform width-100 scale-100"
          leave="transition ease-in duration-200"
          leaveFrom="transform width-100 scale-100"
          leaveTo="transform width-0 scale-95"
          show={show}
        >
          <span>{label}</span>
        </Transition>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    </Tooltip>
  )};
