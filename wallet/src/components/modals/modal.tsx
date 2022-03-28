/* This example requires Tailwind CSS v2.0+ */
import {Fragment, useCallback, useEffect, useRef, useState} from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {ExclamationIcon, QuestionMarkCircleIcon} from '@heroicons/react/outline'
import * as React from "react";

const classNames = (...classes) => classes.filter(Boolean).join(' ');

type ModalProps = {
  show: boolean,
  callbacks: {
    onOK: () => void,
    onClose: () => void
  },
  okText?: string,
  suppressOKButton?: boolean
  okEnabled?: boolean,
  cancelText?: string,
  suppressCancelButton?: boolean
  title: string,
  Icon?: (props: React.ComponentProps<'svg'>) => JSX.Element
  iconClasses?: string,
  suppressClose?: boolean,
}
export const Modal:React.FC<ModalProps> = (
  {
    show,
    title,
    Icon = QuestionMarkCircleIcon,
    iconClasses = '',
    children,
    callbacks: {onOK, onClose},
    suppressOKButton ,
    okText = 'OK',
    okEnabled,
    cancelText = 'Cancel',
    suppressCancelButton,
    suppressClose
  }) => {
  const cancelButtonRef = useRef(null)
  okEnabled = okEnabled === undefined ? true : okEnabled; // defaults to true

  // prevent closure if suppressClose is set (to allow for multiple stacked modals)
  const onCloseInt = useCallback(() => {
    console.log("onClose suppressClose: ", suppressClose);
    suppressClose || onClose();
  }, []);

  return (
    <Transition.Root show={show} as={Fragment}>
      <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" initialFocus={cancelButtonRef}
              onClose={onCloseInt}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg pr-6">
              <div className="mb-5 mx-auto flex-shrink-0 inline-flex items-center justify-center h-12 rounded-full sm:mx-0 sm:h-10">
                <Icon className={classNames(iconClasses, "h-6 w-6")} aria-hidden="true"/>
                <Dialog.Title as="h3" className="text-lg pl-5 mt-1 leading-6 font-medium text-gray-900">
                  {title}
                </Dialog.Title>
              </div>
              <div className="max-h-screen/2 overflow-scroll sm:flex sm:items-start text-center sm:mt-0 sm:text-left w-full">
                {children}
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {suppressOKButton || <button
                  disabled={!okEnabled}
                  type="button"
                  className={classNames(
                    okEnabled ? "bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" : "bg-gray-300",
                    "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm"
                  )}
                  onClick={onOK}
                  data-testid='modalAddButton'
                >
                  {okText}
                </button>}
                {suppressCancelButton || <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={onClose}
                  ref={cancelButtonRef}
                >
                  {cancelText}
                </button>}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
