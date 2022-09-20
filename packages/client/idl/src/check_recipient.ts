export type CheckRecipient = {
  version: "0.1.0";
  name: "check_recipient";
  instructions: [
    {
      name: "create";
      accounts: [
        {
          name: "middlewareAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
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
          name: "recipient";
          type: "publicKey";
        },
        {
          name: "nonce";
          type: "u8";
        },
        {
          name: "bump";
          type: "u8";
        }
      ];
    },
    {
      name: "executeMiddleware";
      accounts: [
        {
          name: "middlewareAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "transactionAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "cryptidProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "checkRecipient";
      type: {
        kind: "struct";
        fields: [
          {
            name: "recipient";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "nonce";
            type: "u8";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "MultipleInstructions";
      msg: "This middleware requires that the transaction have only one instruction";
    },
    {
      code: 6001;
      name: "InvalidProgram";
      msg: "This middleware allows only transfer instructions from the system program";
    },
    {
      code: 6002;
      name: "InvalidInstructionType";
      msg: "This middleware allows only transfer instructions";
    },
    {
      code: 6003;
      name: "InvalidRecipient";
      msg: "This middleware allows only transfers to the designated recipient";
    }
  ];
};

export const IDL: CheckRecipient = {
  version: "0.1.0",
  name: "check_recipient",
  instructions: [
    {
      name: "create",
      accounts: [
        {
          name: "middlewareAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
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
          name: "recipient",
          type: "publicKey",
        },
        {
          name: "nonce",
          type: "u8",
        },
        {
          name: "bump",
          type: "u8",
        },
      ],
    },
    {
      name: "executeMiddleware",
      accounts: [
        {
          name: "middlewareAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "transactionAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "cryptidProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "checkRecipient",
      type: {
        kind: "struct",
        fields: [
          {
            name: "recipient",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "nonce",
            type: "u8",
          },
          {
            name: "bump",
            type: "u8",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "MultipleInstructions",
      msg: "This middleware requires that the transaction have only one instruction",
    },
    {
      code: 6001,
      name: "InvalidProgram",
      msg: "This middleware allows only transfer instructions from the system program",
    },
    {
      code: 6002,
      name: "InvalidInstructionType",
      msg: "This middleware allows only transfer instructions",
    },
    {
      code: 6003,
      name: "InvalidRecipient",
      msg: "This middleware allows only transfers to the designated recipient",
    },
  ],
};
