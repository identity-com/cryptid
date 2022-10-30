export type CheckDid = {
  "version": "0.1.0",
  "name": "check_did",
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
          "name": "verificationMethodMatcher",
          "type": {
            "defined": "VerificationMethodMatcher"
          }
        },
        {
          "name": "serviceMatcher",
          "type": {
            "defined": "ServiceMatcher"
          }
        },
        {
          "name": "controllerMatcher",
          "type": {
            "defined": "ControllerMatcher"
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
          "name": "did",
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
            "An authority on the DID."
          ]
        },
        {
          "name": "cryptidProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The gateway token for the transaction",
            "Must be owned by the owner of the transaction"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "checkDid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The authority of this CheckDid acccount"
            ],
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "verificationMethodMatcher",
            "type": {
              "defined": "VerificationMethodMatcher"
            }
          },
          {
            "name": "serviceMatcher",
            "type": {
              "defined": "ServiceMatcher"
            }
          },
          {
            "name": "controllerMatcher",
            "type": {
              "defined": "ControllerMatcher"
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
  "types": [
    {
      "name": "VerificationMethodMatcher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filterTypes",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "filterFlags",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "filterKeyData",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "filterFragment",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "ServiceMatcher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filterFragment",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "filterServiceType",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "filterServiceEndpoint",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "ControllerMatcher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filterNativeController",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "filterOtherController",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAuthority",
      "msg": "The signer is not a valid authority for this DID"
    },
    {
      "code": 6001,
      "name": "VerificationMethodMatcherError",
      "msg": "VerificationMethodMatcher not satisfied"
    },
    {
      "code": 6002,
      "name": "ServiceMatcherError",
      "msg": "ServiceMatcherError not satisfied"
    },
    {
      "code": 6003,
      "name": "ControllerMatcherError",
      "msg": "ControllerMatcher not satisfied"
    }
  ]
};

export const IDL: CheckDid = {
  "version": "0.1.0",
  "name": "check_did",
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
          "name": "verificationMethodMatcher",
          "type": {
            "defined": "VerificationMethodMatcher"
          }
        },
        {
          "name": "serviceMatcher",
          "type": {
            "defined": "ServiceMatcher"
          }
        },
        {
          "name": "controllerMatcher",
          "type": {
            "defined": "ControllerMatcher"
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
          "name": "did",
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
            "An authority on the DID."
          ]
        },
        {
          "name": "cryptidProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The gateway token for the transaction",
            "Must be owned by the owner of the transaction"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "checkDid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The authority of this CheckDid acccount"
            ],
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "verificationMethodMatcher",
            "type": {
              "defined": "VerificationMethodMatcher"
            }
          },
          {
            "name": "serviceMatcher",
            "type": {
              "defined": "ServiceMatcher"
            }
          },
          {
            "name": "controllerMatcher",
            "type": {
              "defined": "ControllerMatcher"
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
  "types": [
    {
      "name": "VerificationMethodMatcher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filterTypes",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "filterFlags",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "filterKeyData",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "filterFragment",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "ServiceMatcher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filterFragment",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "filterServiceType",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "filterServiceEndpoint",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "ControllerMatcher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filterNativeController",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "filterOtherController",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAuthority",
      "msg": "The signer is not a valid authority for this DID"
    },
    {
      "code": 6001,
      "name": "VerificationMethodMatcherError",
      "msg": "VerificationMethodMatcher not satisfied"
    },
    {
      "code": 6002,
      "name": "ServiceMatcherError",
      "msg": "ServiceMatcherError not satisfied"
    },
    {
      "code": 6003,
      "name": "ControllerMatcherError",
      "msg": "ControllerMatcher not satisfied"
    }
  ]
};
