export type CheckPass = {
  "version": "0.1.0",
  "name": "check_pass",
  "instructions": [
    {
      "name": "create",
      "accounts": [
        {
          "name": "middlewareAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "gatekeeperNetwork",
          "type": "publicKey"
        },
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "expireOnUse",
          "type": "bool"
        }
      ]
    },
    {
      "name": "executeMiddleware",
      "accounts": [
        {
          "name": "middlewareAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transactionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The owner of the Cryptid instance, typically a DID account",
            "Passed here so that the DID document can be parsed.",
            "The gateway token can be on any key provably owned by the DID."
          ]
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "An authority on the DID.",
            "This is only needed for the expireOnUse case. In this case, the authority must be the owner",
            "of the gateway token."
          ]
        },
        {
          "name": "expireFeatureAccount",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The gatekeeper network expire feature",
            "Used only on the expireOnUse case."
          ]
        },
        {
          "name": "gatewayToken",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The gateway token for the transaction",
            "Must be owned by the owner of the transaction"
          ]
        },
        {
          "name": "cryptidProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gatewayProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "checkPass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gatekeeperNetwork",
            "type": "publicKey"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "expireOnUse",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidPass",
      "msg": "The provided pass is not valid"
    },
    {
      "code": 6001,
      "name": "InvalidPassAuthority",
      "msg": "The provided pass is not owned by a key on the transaction owner DID"
    },
    {
      "code": 6002,
      "name": "ExpiryError",
      "msg": "An error occured when expiring the single-use gateway token"
    }
  ]
};

export const IDL: CheckPass = {
  "version": "0.1.0",
  "name": "check_pass",
  "instructions": [
    {
      "name": "create",
      "accounts": [
        {
          "name": "middlewareAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "gatekeeperNetwork",
          "type": "publicKey"
        },
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "expireOnUse",
          "type": "bool"
        }
      ]
    },
    {
      "name": "executeMiddleware",
      "accounts": [
        {
          "name": "middlewareAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transactionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The owner of the Cryptid instance, typically a DID account",
            "Passed here so that the DID document can be parsed.",
            "The gateway token can be on any key provably owned by the DID."
          ]
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "An authority on the DID.",
            "This is only needed for the expireOnUse case. In this case, the authority must be the owner",
            "of the gateway token."
          ]
        },
        {
          "name": "expireFeatureAccount",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The gatekeeper network expire feature",
            "Used only on the expireOnUse case."
          ]
        },
        {
          "name": "gatewayToken",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The gateway token for the transaction",
            "Must be owned by the owner of the transaction"
          ]
        },
        {
          "name": "cryptidProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gatewayProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "checkPass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gatekeeperNetwork",
            "type": "publicKey"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "expireOnUse",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidPass",
      "msg": "The provided pass is not valid"
    },
    {
      "code": 6001,
      "name": "InvalidPassAuthority",
      "msg": "The provided pass is not owned by a key on the transaction owner DID"
    },
    {
      "code": 6002,
      "name": "ExpiryError",
      "msg": "An error occured when expiring the single-use gateway token"
    }
  ]
};
