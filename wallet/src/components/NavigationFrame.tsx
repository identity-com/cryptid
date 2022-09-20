import React, { useState, Fragment } from 'react';
import { useConnectionConfig } from '../utils/connection';
import {
  // clusterForEndpoint,
  getClusters,
  // addCustomCluster,
  // customClusterExists,
} from '../utils/clusters';
import { usePage } from '../utils/page';
// import AddCustomClusterDialog from "./AddCustomClusterDialog";
import {
  CogIcon,
  // MenuIcon,
  // XIcon,
} from "@heroicons/react/outline";
import {Menu, Disclosure, Transition} from "@headlessui/react";
import { pages } from "../utils/config";
import IdentitySelector from './selectors/IdentitySelector';

const classNames = (...classes) => classes.filter(Boolean).join(' ');


const NetworkSelector = () => {
  const { endpoint, setEndpoint } = useConnectionConfig();
  const [anchorEl, setAnchorEl] = useState(null);
  // const [addCustomNetworkOpen, setCustomNetworkOpen] = useState(false);

  return (
    <div className="hidden sm:ml-6 sm:flex sm:items-center">
      {/*<AddCustomClusterDialog*/}
      {/*  open={addCustomNetworkOpen}*/}
      {/*  onClose={() => setCustomNetworkOpen(false)}*/}
      {/*  onAdd={({ name, apiUrl }) => {*/}
      {/*    addCustomCluster(name, apiUrl);*/}
      {/*    setCustomNetworkOpen(false);*/}
      {/*  }}*/}
      {/*/>*/}
      <Menu as="div" className="ml-3 relative">
        <div>
          <Menu.Button
            className="max-w-xs bg-white text-gray-400 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800" data-testid="settingsIcon">
            <span className="sr-only">Select Network</span>
            <CogIcon className="h-6 w-6" aria-hidden="true"/>
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className="z-30 origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            {getClusters().map((cluster) => (
              <Menu.Item key={cluster.apiUrl}>
                {({ active }) => (
                  /*{ cluster.apiUrl === endpoint && <CheckIcon className="px-4 py-2" /> }*/
                  <a
                    className={classNames(
                      cluster.apiUrl === endpoint ? 'bg-gray-200' : '',
                      active ? 'bg-gray-100' : '',
                      'block px-2 py-2 text-sm text-gray-700'
                    )}
                    onClick={() => {
                      setAnchorEl(null);
                      setEndpoint(cluster.apiUrl);
                    }}
                  >
                    {cluster.name === 'mainnet-beta-backup'
                      ? 'Mainnet Beta Backup'
                      : (cluster.name || cluster.apiUrl)}
                  </a>
                )}
              </Menu.Item>
            ))}
            {/*<Menu.Item*/}
            {/*  onClick={() => {*/}
            {/*    setCustomNetworkOpen(true);*/}
            {/*  }}*/}
            {/*>*/}
            {/*  <a*/}
            {/*    className="block px-2 py-2 text-sm text-gray-700"*/}
            {/*    onClick={() => {*/}
            {/*      setCustomNetworkOpen(true);*/}
            {/*    }}>{customClusterExists() ? 'Edit Custom Endpoint' : 'Add Custom Endpoint'}*/}
            {/*  </a>*/}
            {/*</Menu.Item>*/}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}

function NavigationPanel({ isSignerWindow }: { isSignerWindow: boolean }) {
  const { page, setPage } = usePage()

  if (isSignerWindow){

  } else {

  }
  return (
    <Disclosure as="nav" className="bg-white bg-opacity-50 border-b border-gray-200">
      {({ open }) => (
        <>
          <div className="md:py-10 w-screen max-w-screen md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex justify-between h-32 items-center">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <img
                    className="block h-16 md:h-28 w-auto"
                    src="logo300.png"
                    alt="Cryptid squid"
                  />
                  <img
                    className="block h-4 md:h-8 w-auto"
                    src="title.png"
                    alt="Cryptid"
                  />
                </div>
                {!isSignerWindow && <div className="ml-6 flex sm:space-x-8">
                      {pages.map((item) => (
                        <a
                          href='#'
                          key={item}
                          onClick={() => setPage(item)}
                          className={classNames(
                            item === page
                              ? 'border-red-800 text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                            'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
                          )}
                          data-testid="navigationTab"
                          aria-current={item === page ? 'page' : undefined}
                        >
                          {item}
                        </a>
                      ))}
                    </div>}
              </div>

              <div className="ml-6 gap-4 sm:flex items-center">
                {! isSignerWindow && <NetworkSelector/>}
                <IdentitySelector isSignerWindow={isSignerWindow}/>
              </div>
              {/*<div className="-mr-2 flex items-center sm:hidden">*/}
              {/*  /!* Mobile menu button *!/*/}
              {/*  <Disclosure.Button*/}
              {/*    className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800">*/}
              {/*    <span className="sr-only">Open main menu</span>*/}
              {/*    {open ? (*/}
              {/*      <XIcon className="block h-6 w-6" aria-hidden="true"/>*/}
              {/*    ) : (*/}
              {/*      <MenuIcon className="block h-6 w-6" aria-hidden="true"/>*/}
              {/*    )}*/}
              {/*  </Disclosure.Button>*/}
              {/*</div>*/}

            </div>
          </div>
        </>
      )}
    </Disclosure>
  )
}

export default function NavigationFrame({ children, isSignerWindow }: { children: JSX.Element | JSX.Element[], isSignerWindow: boolean }) {
  return (
    <div className="min-h-screen">
      <NavigationPanel isSignerWindow={isSignerWindow}/>
      {children}
    </div>
  )
}
