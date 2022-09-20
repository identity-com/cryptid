export type TimeDelay = {
  version: "0.1.0";
  name: "time_delay";
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
          name: "seconds";
          type: "i64";
        },
        {
          name: "bump";
          type: "u8";
        }
      ];
    },
    {
      name: "registerTransaction";
      accounts: [
        {
          name: "middlewareAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "transactionAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "transactionCreateTime";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
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
          name: "destination";
          isMut: true;
          isSigner: false;
        },
        {
          name: "transactionCreateTime";
          isMut: true;
          isSigner: false;
          docs: [
            "The account containing the transaction create time",
            "the current time must be after the one registered here"
          ];
        },
        {
          name: "cryptidProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "transactionCreateTimeBump";
          type: "u8";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "timeDelay";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "seconds";
            type: "i64";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "transactionCreationTime";
      type: {
        kind: "struct";
        fields: [
          {
            name: "time";
            type: "i64";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "TooSoon";
      msg: "The transaction cannot be executed yet";
    }
  ];
};

export const IDL: TimeDelay = {
  version: "0.1.0",
  name: "time_delay",
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
          name: "seconds",
          type: "i64",
        },
        {
          name: "bump",
          type: "u8",
        },
      ],
    },
    {
      name: "registerTransaction",
      accounts: [
        {
          name: "middlewareAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "transactionAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "transactionCreateTime",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
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
          name: "destination",
          isMut: true,
          isSigner: false,
        },
        {
          name: "transactionCreateTime",
          isMut: true,
          isSigner: false,
          docs: [
            "The account containing the transaction create time",
            "the current time must be after the one registered here",
          ],
        },
        {
          name: "cryptidProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "transactionCreateTimeBump",
          type: "u8",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "timeDelay",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "seconds",
            type: "i64",
          },
          {
            name: "bump",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "transactionCreationTime",
      type: {
        kind: "struct",
        fields: [
          {
            name: "time",
            type: "i64",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "TooSoon",
      msg: "The transaction cannot be executed yet",
    },
  ],
};
