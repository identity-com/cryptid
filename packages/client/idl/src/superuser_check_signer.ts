export type SuperuserCheckSigner = {
  "version": "0.1.0",
  "name": "superuser_check_signer",
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
          "name": "signer",
          "type": "publicKey"
        },
        {
          "name": "bump",
          "type": "u8"
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
      "docs": [
        "execute the middleware - checking that any previous middleware have been executed",
        "Note- there is no additional check needed here - the signer check is already verified",
        "by anchor."
      ],
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
          "name": "cryptidAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "cryptidProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "superuserCheckSigner",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signer",
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
      "name": "InvalidSigner",
      "msg": "The middleware execution was signed by the wrong signer"
    }
  ]
};

export const IDL: SuperuserCheckSigner = {
  "version": "0.1.0",
  "name": "superuser_check_signer",
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
          "name": "signer",
          "type": "publicKey"
        },
        {
          "name": "bump",
          "type": "u8"
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
      "docs": [
        "execute the middleware - checking that any previous middleware have been executed",
        "Note- there is no additional check needed here - the signer check is already verified",
        "by anchor."
      ],
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
          "name": "cryptidAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "cryptidProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "superuserCheckSigner",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signer",
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
      "name": "InvalidSigner",
      "msg": "The middleware execution was signed by the wrong signer"
    }
  ]
};
