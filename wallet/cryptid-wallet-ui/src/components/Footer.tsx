import { FC } from 'react';
import logo from '../../public/logo300.png'
export const Footer: FC = () => {
    return (
        <div className="">
            <footer className="mx-auto  flex flex-row p-2 text-center items-center footer bg-neutral text-neutral-content">
                <img className='h-10' src={logo.src}></img>
                <div className="max-w-md mx-auto sm:pl-12 grid-flow-col gap-4 text-center">
                    
                    
                </div>
                <div className="absolute bottom-0 right-0 grid-flow-col gap-4 text-center pr-2">
                    <div>
                        <p className="text-black text-base font-light cursor-default ">
                            Powered by
                        </p>
                        <a
                            rel="noreferrer"
                            href="https://identity.com/"
                            target="_blank"
                            className=" text-black  text-base font-bold hover:text-primary-dark transition-all duration-200"
                        >
                            Cryptid
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};
