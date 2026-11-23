// Generado desde Rust mediante anchor-lang-idl. No editar manualmente.
export type Khiputrace = {
  "address": "GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv",
  "metadata": {
    "name": "khiputrace",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "closeFinding",
      "discriminator": [
        75,
        252,
        175,
        206,
        114,
        1,
        81,
        134
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          },
          "relations": [
            "finding"
          ]
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "account",
                "path": "finding.findingId",
                "account": "finding"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createAudit",
      "discriminator": [
        241,
        38,
        131,
        159,
        29,
        231,
        247,
        165
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "auditId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auditId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        }
      ]
    },
    {
      "name": "createFinding",
      "discriminator": [
        20,
        142,
        156,
        1,
        159,
        170,
        211,
        238
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          }
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "arg",
                "path": "findingId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "findingId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "severity",
          "type": {
            "defined": {
              "name": "severity"
            }
          }
        }
      ]
    },
    {
      "name": "resolveFinding",
      "discriminator": [
        64,
        166,
        116,
        122,
        187,
        188,
        184,
        157
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          },
          "relations": [
            "finding"
          ]
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "account",
                "path": "finding.findingId",
                "account": "finding"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "remediationNote",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateFinding",
      "discriminator": [
        180,
        60,
        125,
        158,
        30,
        165,
        235,
        228
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          },
          "relations": [
            "finding"
          ]
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "account",
                "path": "finding.findingId",
                "account": "finding"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "severity",
          "type": {
            "defined": {
              "name": "severity"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "audit",
      "discriminator": [
        242,
        65,
        202,
        147,
        141,
        103,
        253,
        134
      ]
    },
    {
      "name": "finding",
      "discriminator": [
        207,
        23,
        56,
        14,
        197,
        170,
        203,
        34
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "La wallet no es la autoridad de la auditoría."
    },
    {
      "code": 6001,
      "name": "auditMismatch",
      "msg": "El hallazgo no pertenece a la auditoría indicada."
    },
    {
      "code": 6002,
      "name": "invalidText",
      "msg": "El texto está vacío o excede su límite de bytes UTF-8."
    },
    {
      "code": 6003,
      "name": "invalidTransition",
      "msg": "La transición de estado no está permitida."
    },
    {
      "code": 6004,
      "name": "correctiveActionRequired",
      "msg": "Se requiere una acción correctiva válida."
    },
    {
      "code": 6005,
      "name": "findingNotResolved",
      "msg": "El hallazgo debe estar resuelto."
    },
    {
      "code": 6006,
      "name": "counterOverflow",
      "msg": "El contador no puede incrementarse."
    },
    {
      "code": 6007,
      "name": "counterUnderflow",
      "msg": "El contador no puede decrementarse."
    },
    {
      "code": 6008,
      "name": "unexpectedFindingId",
      "msg": "El ID no coincide con el siguiente hallazgo de la auditoría."
    },
    {
      "code": 6009,
      "name": "invalidCounters",
      "msg": "Los contadores de la auditoría son inconsistentes."
    },
    {
      "code": 6010,
      "name": "invalidPda",
      "msg": "La cuenta no corresponde a su PDA canónica."
    },
    {
      "code": 6011,
      "name": "invalidBump",
      "msg": "El bump almacenado no es canónico."
    },
    {
      "code": 6012,
      "name": "unsupportedVersion",
      "msg": "La versión del esquema no es compatible."
    },
    {
      "code": 6013,
      "name": "invalidOwner",
      "msg": "La cuenta no pertenece al programa KhipuTrace."
    }
  ],
  "types": [
    {
      "name": "audit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "auditId",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "nextFindingId",
            "type": "u64"
          },
          {
            "name": "activeFindings",
            "type": "u64"
          },
          {
            "name": "openFindings",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "finding",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "audit",
            "type": "pubkey"
          },
          {
            "name": "findingId",
            "type": "u64"
          },
          {
            "name": "severity",
            "type": {
              "defined": {
                "name": "severity"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "findingStatus"
              }
            }
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "remediationNote",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "findingStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "resolved"
          }
        ]
      }
    },
    {
      "name": "severity",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "low"
          },
          {
            "name": "medium"
          },
          {
            "name": "high"
          },
          {
            "name": "critical"
          }
        ]
      }
    }
  ]
};

export const IDL: Khiputrace = {
  "address": "GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv",
  "metadata": {
    "name": "khiputrace",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "closeFinding",
      "discriminator": [
        75,
        252,
        175,
        206,
        114,
        1,
        81,
        134
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          },
          "relations": [
            "finding"
          ]
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "account",
                "path": "finding.findingId",
                "account": "finding"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createAudit",
      "discriminator": [
        241,
        38,
        131,
        159,
        29,
        231,
        247,
        165
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "auditId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auditId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        }
      ]
    },
    {
      "name": "createFinding",
      "discriminator": [
        20,
        142,
        156,
        1,
        159,
        170,
        211,
        238
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          }
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "arg",
                "path": "findingId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "findingId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "severity",
          "type": {
            "defined": {
              "name": "severity"
            }
          }
        }
      ]
    },
    {
      "name": "resolveFinding",
      "discriminator": [
        64,
        166,
        116,
        122,
        187,
        188,
        184,
        157
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          },
          "relations": [
            "finding"
          ]
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "account",
                "path": "finding.findingId",
                "account": "finding"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "remediationNote",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateFinding",
      "discriminator": [
        180,
        60,
        125,
        158,
        30,
        165,
        235,
        228
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "audit"
          ]
        },
        {
          "name": "audit",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "audit.authority",
                "account": "audit"
              },
              {
                "kind": "account",
                "path": "audit.auditId",
                "account": "audit"
              }
            ]
          },
          "relations": [
            "finding"
          ]
        },
        {
          "name": "finding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "audit"
              },
              {
                "kind": "account",
                "path": "finding.findingId",
                "account": "finding"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "severity",
          "type": {
            "defined": {
              "name": "severity"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "audit",
      "discriminator": [
        242,
        65,
        202,
        147,
        141,
        103,
        253,
        134
      ]
    },
    {
      "name": "finding",
      "discriminator": [
        207,
        23,
        56,
        14,
        197,
        170,
        203,
        34
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "La wallet no es la autoridad de la auditoría."
    },
    {
      "code": 6001,
      "name": "auditMismatch",
      "msg": "El hallazgo no pertenece a la auditoría indicada."
    },
    {
      "code": 6002,
      "name": "invalidText",
      "msg": "El texto está vacío o excede su límite de bytes UTF-8."
    },
    {
      "code": 6003,
      "name": "invalidTransition",
      "msg": "La transición de estado no está permitida."
    },
    {
      "code": 6004,
      "name": "correctiveActionRequired",
      "msg": "Se requiere una acción correctiva válida."
    },
    {
      "code": 6005,
      "name": "findingNotResolved",
      "msg": "El hallazgo debe estar resuelto."
    },
    {
      "code": 6006,
      "name": "counterOverflow",
      "msg": "El contador no puede incrementarse."
    },
    {
      "code": 6007,
      "name": "counterUnderflow",
      "msg": "El contador no puede decrementarse."
    },
    {
      "code": 6008,
      "name": "unexpectedFindingId",
      "msg": "El ID no coincide con el siguiente hallazgo de la auditoría."
    },
    {
      "code": 6009,
      "name": "invalidCounters",
      "msg": "Los contadores de la auditoría son inconsistentes."
    },
    {
      "code": 6010,
      "name": "invalidPda",
      "msg": "La cuenta no corresponde a su PDA canónica."
    },
    {
      "code": 6011,
      "name": "invalidBump",
      "msg": "El bump almacenado no es canónico."
    },
    {
      "code": 6012,
      "name": "unsupportedVersion",
      "msg": "La versión del esquema no es compatible."
    },
    {
      "code": 6013,
      "name": "invalidOwner",
      "msg": "La cuenta no pertenece al programa KhipuTrace."
    }
  ],
  "types": [
    {
      "name": "audit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "auditId",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "nextFindingId",
            "type": "u64"
          },
          {
            "name": "activeFindings",
            "type": "u64"
          },
          {
            "name": "openFindings",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "finding",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "audit",
            "type": "pubkey"
          },
          {
            "name": "findingId",
            "type": "u64"
          },
          {
            "name": "severity",
            "type": {
              "defined": {
                "name": "severity"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "findingStatus"
              }
            }
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "remediationNote",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "findingStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "resolved"
          }
        ]
      }
    },
    {
      "name": "severity",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "low"
          },
          {
            "name": "medium"
          },
          {
            "name": "high"
          },
          {
            "name": "critical"
          }
        ]
      }
    }
  ]
};
