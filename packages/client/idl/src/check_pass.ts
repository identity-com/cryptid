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
        },
        {
          "name": "failsafe",
          "type": {
            "option": "publicKey"
          }
        },
        {
          "name": "previousMiddleware",
          "type": {
            "option": "publicKey"
          }
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
            "This is needed for two cases:",
            "1) the expireOnUse case. In this case, the authority must be the owner of the gateway token.",
            "2) the failsafe case. In this case, the authority must match the failsafe key (if present)"
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
            "docs": [
              "The gatekeeper network that this middleware checks against",
              "If the signer presents a valid gateway token, owned either by the DID that owns the transaction",
              "or by a key on the DID that owns the transaction, then the transaction is approved."
            ],
            "type": "publicKey"
          },
          {
            "name": "authority",
            "docs": [
              "The authority creating t"
            ],
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "expireOnUse",
            "docs": [
              "If true, expire a gateway token after it has been used. Note, this can only be used",
              "with gatekeeper networks that have the ExpireFeature enabled."
            ],
            "type": "bool"
          },
          {
            "name": "failsafe",
            "docs": [
              "A key which, if passed as the authority, bypasses the middleware check"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "previousMiddleware",
            "docs": [
              "The previous middleware in the chain, if any"
            ],
            "type": {
              "option": "publicKey"
            }
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
        },
        {
          "name": "failsafe",
          "type": {
            "option": "publicKey"
          }
        },
        {
          "name": "previousMiddleware",
          "type": {
            "option": "publicKey"
          }
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
            "This is needed for two cases:",
            "1) the expireOnUse case. In this case, the authority must be the owner of the gateway token.",
            "2) the failsafe case. In this case, the authority must match the failsafe key (if present)"
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
            "docs": [
              "The gatekeeper network that this middleware checks against",
              "If the signer presents a valid gateway token, owned either by the DID that owns the transaction",
              "or by a key on the DID that owns the transaction, then the transaction is approved."
            ],
            "type": "publicKey"
          },
          {
            "name": "authority",
            "docs": [
              "The authority creating t"
            ],
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "expireOnUse",
            "docs": [
              "If true, expire a gateway token after it has been used. Note, this can only be used",
              "with gatekeeper networks that have the ExpireFeature enabled."
            ],
            "type": "bool"
          },
          {
            "name": "failsafe",
            "docs": [
              "A key which, if passed as the authority, bypasses the middleware check"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "previousMiddleware",
            "docs": [
              "The previous middleware in the chain, if any"
            ],
            "type": {
              "option": "publicKey"
            }
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
