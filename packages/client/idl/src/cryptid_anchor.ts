export type CryptidAnchor = {
  version: "0.1.0";
  name: "cryptid_anchor";
  instructions: [
    {
      name: "create";
      accounts: [
        {
          name: "cryptidAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "didProgram";
          isMut: false;
          isSigner: false;
          docs: ["The program for the DID"];
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: ["The DID of the Cryptid instance"];
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
          docs: ["The signer of the transaction. Must be a DID authority."];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "middleware";
          type: {
            option: "publicKey";
          };
        },
        {
          name: "index";
          type: "u32";
        },
        {
          name: "bump";
          type: "u8";
        }
      ];
    },
    {
      name: "directExecute";
      accounts: [
        {
          name: "cryptidAccount";
          isMut: true;
          isSigner: false;
          docs: ["The Cryptid instance to execute with"];
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: ["The DID on the Cryptid instance"];
        },
        {
          name: "didProgram";
          isMut: false;
          isSigner: false;
          docs: ["The program for the DID"];
        },
        {
          name: "signer";
          isMut: false;
          isSigner: true;
          docs: ["The signer of the transaction"];
        }
      ];
      args: [
        {
          name: "controllerChain";
          type: "bytes";
        },
        {
          name: "instructions";
          type: {
            vec: {
              defined: "AbbreviatedInstructionData";
            };
          };
        },
        {
          name: "cryptidAccountBump";
          type: "u8";
        },
        {
          name: "flags";
          type: "u8";
        }
      ];
    },
    {
      name: "proposeTransaction";
      accounts: [
        {
          name: "cryptidAccount";
          isMut: false;
          isSigner: false;
          docs: ["The Cryptid instance that can execute the transaction."];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: false;
          docs: ["The owner of the Cryptid instance, typically a DID account"];
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "transactionAccount";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "instructions";
          type: {
            vec: {
              defined: "AbbreviatedInstructionData";
            };
          };
        },
        {
          name: "numAccounts";
          type: "u8";
        }
      ];
    },
    {
      name: "executeTransaction";
      accounts: [
        {
          name: "cryptidAccount";
          isMut: true;
          isSigner: false;
          docs: ["The Cryptid instance to execute with"];
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: ["The DID on the Cryptid instance"];
        },
        {
          name: "didProgram";
          isMut: false;
          isSigner: false;
          docs: ["The program for the DID"];
        },
        {
          name: "signer";
          isMut: false;
          isSigner: true;
          docs: ["The signer of the transaction"];
        },
        {
          name: "destination";
          isMut: true;
          isSigner: false;
        },
        {
          name: "transactionAccount";
          isMut: true;
          isSigner: false;
          docs: ["The instruction to execute"];
        }
      ];
      args: [
        {
          name: "controllerChain";
          type: "bytes";
        },
        {
          name: "cryptidAccountBump";
          type: "u8";
        },
        {
          name: "flags";
          type: "u8";
        }
      ];
    },
    {
      name: "approveExecution";
      accounts: [
        {
          name: "middlewareAccount";
          isMut: false;
          isSigner: true;
        },
        {
          name: "transactionAccount";
          isMut: true;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "cryptidAccount";
      docs: ["The data for an on-chain Cryptid Account"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "middleware";
            docs: ["The middleware, if any, used by this cryptid account"];
            type: {
              option: "publicKey";
            };
          },
          {
            name: "index";
            docs: [
              "The index of this cryptid account - allows multiple cryptid accounts per DID"
            ];
            type: "u32";
          }
        ];
      };
    },
    {
      name: "transactionAccount";
      docs: [
        "A proposed transaction stored on-chain, in preparation to be executed"
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "cryptidAccount";
            docs: ["The cryptid account for the transaction"];
            type: "publicKey";
          },
          {
            name: "owner";
            docs: [
              "The owner of the cryptid account (Typically a DID account)"
            ];
            type: "publicKey";
          },
          {
            name: "accounts";
            docs: [
              "The accounts `instructions` references (excluding the cryptid account"
            ];
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "instructions";
            docs: ["The instructions that will be executed"];
            type: {
              vec: {
                defined: "AbbreviatedInstructionData";
              };
            };
          },
          {
            name: "approvedMiddleware";
            docs: [
              "The most recent middleware PDA that approved the transaction"
            ];
            type: {
              option: "publicKey";
            };
          },
          {
            name: "slot";
            docs: [
              "The slot in which the transaction was proposed",
              "This is used to prevent replay attacks TODO: Do we need it?"
            ];
            type: "u8";
          },
          {
            name: "state";
            docs: [
              "The transaction state, to prevent replay attacks",
              "in case an executed transaction account is not immediately",
              "garbage-collected by the runtime"
            ];
            type: {
              defined: "TransactionState";
            };
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "AbbreviatedAccountMeta";
      docs: [
        "An account for an instruction, similar to Solana's [`AccountMeta`](AccountMeta)"
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "key";
            docs: ["The key of the account"];
            type: "u8";
          },
          {
            name: "meta";
            docs: ["Information about the account"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "AbbreviatedInstructionData";
      docs: [
        "The data about an instruction to be executed. Similar to Solana's [`Instruction`](SolanaInstruction).",
        "Accounts are stored as indices in AbbreviatedAccountMeta to save space"
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "programId";
            docs: ["The program to execute"];
            type: "u8";
          },
          {
            name: "accounts";
            docs: ["The accounts to send to the program"];
            type: {
              vec: {
                defined: "AbbreviatedAccountMeta";
              };
            };
          },
          {
            name: "data";
            docs: ["The data for the instruction"];
            type: "bytes";
          }
        ];
      };
    },
    {
      name: "InstructionSize";
      docs: ["A helper struct for calculating [`InstructionData`] size"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "accounts";
            docs: ["The number of accounts in the instruction"];
            type: "u8";
          },
          {
            name: "dataLen";
            docs: ["The size of the instruction data"];
            type: "u16";
          }
        ];
      };
    },
    {
      name: "TransactionState";
      docs: ["A [`TransactionAccount`]'s state"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "NotReady";
          },
          {
            name: "Ready";
          },
          {
            name: "Executed";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "NotEnoughSigners";
      msg: "Not enough signers";
    },
    {
      code: 6001;
      name: "WrongDID";
      msg: "Wrong DID";
    },
    {
      code: 6002;
      name: "WrongDIDProgram";
      msg: "Wrong DID program";
    },
    {
      code: 6003;
      name: "WrongCryptidAccount";
      msg: "Wrong Cryptid account program";
    },
    {
      code: 6004;
      name: "SubInstructionError";
      msg: "Error in sub-instruction";
    },
    {
      code: 6005;
      name: "InvalidTransactionState";
      msg: "Invalid transaction state";
    },
    {
      code: 6006;
      name: "AccountMismatch";
      msg: "An account in the transaction accounts did not match what was expected";
    },
    {
      code: 6007;
      name: "KeyCannotChangeTransaction";
      msg: "Key is not a proposer for the transaction";
    },
    {
      code: 6008;
      name: "KeyMustBeSigner";
      msg: "Signer is not authorised to sign for this Cryptid account";
    },
    {
      code: 6009;
      name: "IndexOutOfRange";
      msg: "Index out of range.";
    },
    {
      code: 6010;
      name: "NoAccountFromSeeds";
      msg: "No account from seeds.";
    },
    {
      code: 6011;
      name: "AccountNotFromSeeds";
      msg: "Account not from seeds.";
    },
    {
      code: 6012;
      name: "IncorrectMiddleware";
      msg: "The expected middleware did not approve the transaction.";
    }
  ];
};

export const IDL: CryptidAnchor = {
  version: "0.1.0",
  name: "cryptid_anchor",
  instructions: [
    {
      name: "create",
      accounts: [
        {
          name: "cryptidAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "didProgram",
          isMut: false,
          isSigner: false,
          docs: ["The program for the DID"],
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: ["The DID of the Cryptid instance"],
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
          docs: ["The signer of the transaction. Must be a DID authority."],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "middleware",
          type: {
            option: "publicKey",
          },
        },
        {
          name: "index",
          type: "u32",
        },
        {
          name: "bump",
          type: "u8",
        },
      ],
    },
    {
      name: "directExecute",
      accounts: [
        {
          name: "cryptidAccount",
          isMut: true,
          isSigner: false,
          docs: ["The Cryptid instance to execute with"],
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: ["The DID on the Cryptid instance"],
        },
        {
          name: "didProgram",
          isMut: false,
          isSigner: false,
          docs: ["The program for the DID"],
        },
        {
          name: "signer",
          isMut: false,
          isSigner: true,
          docs: ["The signer of the transaction"],
        },
      ],
      args: [
        {
          name: "controllerChain",
          type: "bytes",
        },
        {
          name: "instructions",
          type: {
            vec: {
              defined: "AbbreviatedInstructionData",
            },
          },
        },
        {
          name: "cryptidAccountBump",
          type: "u8",
        },
        {
          name: "flags",
          type: "u8",
        },
      ],
    },
    {
      name: "proposeTransaction",
      accounts: [
        {
          name: "cryptidAccount",
          isMut: false,
          isSigner: false,
          docs: ["The Cryptid instance that can execute the transaction."],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: false,
          docs: ["The owner of the Cryptid instance, typically a DID account"],
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "transactionAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "instructions",
          type: {
            vec: {
              defined: "AbbreviatedInstructionData",
            },
          },
        },
        {
          name: "numAccounts",
          type: "u8",
        },
      ],
    },
    {
      name: "executeTransaction",
      accounts: [
        {
          name: "cryptidAccount",
          isMut: true,
          isSigner: false,
          docs: ["The Cryptid instance to execute with"],
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: ["The DID on the Cryptid instance"],
        },
        {
          name: "didProgram",
          isMut: false,
          isSigner: false,
          docs: ["The program for the DID"],
        },
        {
          name: "signer",
          isMut: false,
          isSigner: true,
          docs: ["The signer of the transaction"],
        },
        {
          name: "destination",
          isMut: true,
          isSigner: false,
        },
        {
          name: "transactionAccount",
          isMut: true,
          isSigner: false,
          docs: ["The instruction to execute"],
        },
      ],
      args: [
        {
          name: "controllerChain",
          type: "bytes",
        },
        {
          name: "cryptidAccountBump",
          type: "u8",
        },
        {
          name: "flags",
          type: "u8",
        },
      ],
    },
    {
      name: "approveExecution",
      accounts: [
        {
          name: "middlewareAccount",
          isMut: false,
          isSigner: true,
        },
        {
          name: "transactionAccount",
          isMut: true,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "cryptidAccount",
      docs: ["The data for an on-chain Cryptid Account"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "middleware",
            docs: ["The middleware, if any, used by this cryptid account"],
            type: {
              option: "publicKey",
            },
          },
          {
            name: "index",
            docs: [
              "The index of this cryptid account - allows multiple cryptid accounts per DID",
            ],
            type: "u32",
          },
        ],
      },
    },
    {
      name: "transactionAccount",
      docs: [
        "A proposed transaction stored on-chain, in preparation to be executed",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "cryptidAccount",
            docs: ["The cryptid account for the transaction"],
            type: "publicKey",
          },
          {
            name: "owner",
            docs: [
              "The owner of the cryptid account (Typically a DID account)",
            ],
            type: "publicKey",
          },
          {
            name: "accounts",
            docs: [
              "The accounts `instructions` references (excluding the cryptid account",
            ],
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "instructions",
            docs: ["The instructions that will be executed"],
            type: {
              vec: {
                defined: "AbbreviatedInstructionData",
              },
            },
          },
          {
            name: "approvedMiddleware",
            docs: [
              "The most recent middleware PDA that approved the transaction",
            ],
            type: {
              option: "publicKey",
            },
          },
          {
            name: "slot",
            docs: [
              "The slot in which the transaction was proposed",
              "This is used to prevent replay attacks TODO: Do we need it?",
            ],
            type: "u8",
          },
          {
            name: "state",
            docs: [
              "The transaction state, to prevent replay attacks",
              "in case an executed transaction account is not immediately",
              "garbage-collected by the runtime",
            ],
            type: {
              defined: "TransactionState",
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "AbbreviatedAccountMeta",
      docs: [
        "An account for an instruction, similar to Solana's [`AccountMeta`](AccountMeta)",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "key",
            docs: ["The key of the account"],
            type: "u8",
          },
          {
            name: "meta",
            docs: ["Information about the account"],
            type: "u8",
          },
        ],
      },
    },
    {
      name: "AbbreviatedInstructionData",
      docs: [
        "The data about an instruction to be executed. Similar to Solana's [`Instruction`](SolanaInstruction).",
        "Accounts are stored as indices in AbbreviatedAccountMeta to save space",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "programId",
            docs: ["The program to execute"],
            type: "u8",
          },
          {
            name: "accounts",
            docs: ["The accounts to send to the program"],
            type: {
              vec: {
                defined: "AbbreviatedAccountMeta",
              },
            },
          },
          {
            name: "data",
            docs: ["The data for the instruction"],
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "InstructionSize",
      docs: ["A helper struct for calculating [`InstructionData`] size"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "accounts",
            docs: ["The number of accounts in the instruction"],
            type: "u8",
          },
          {
            name: "dataLen",
            docs: ["The size of the instruction data"],
            type: "u16",
          },
        ],
      },
    },
    {
      name: "TransactionState",
      docs: ["A [`TransactionAccount`]'s state"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "NotReady",
          },
          {
            name: "Ready",
          },
          {
            name: "Executed",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "NotEnoughSigners",
      msg: "Not enough signers",
    },
    {
      code: 6001,
      name: "WrongDID",
      msg: "Wrong DID",
    },
    {
      code: 6002,
      name: "WrongDIDProgram",
      msg: "Wrong DID program",
    },
    {
      code: 6003,
      name: "WrongCryptidAccount",
      msg: "Wrong Cryptid account program",
    },
    {
      code: 6004,
      name: "SubInstructionError",
      msg: "Error in sub-instruction",
    },
    {
      code: 6005,
      name: "InvalidTransactionState",
      msg: "Invalid transaction state",
    },
    {
      code: 6006,
      name: "AccountMismatch",
      msg: "An account in the transaction accounts did not match what was expected",
    },
    {
      code: 6007,
      name: "KeyCannotChangeTransaction",
      msg: "Key is not a proposer for the transaction",
    },
    {
      code: 6008,
      name: "KeyMustBeSigner",
      msg: "Signer is not authorised to sign for this Cryptid account",
    },
    {
      code: 6009,
      name: "IndexOutOfRange",
      msg: "Index out of range.",
    },
    {
      code: 6010,
      name: "NoAccountFromSeeds",
      msg: "No account from seeds.",
    },
    {
      code: 6011,
      name: "AccountNotFromSeeds",
      msg: "Account not from seeds.",
    },
    {
      code: 6012,
      name: "IncorrectMiddleware",
      msg: "The expected middleware did not approve the transaction.",
    },
  ],
};
