#!/usr/bin/env bash
set -e
set -u

if [ "${STAGE}" == "prod" ]; then
  DISTRIBUTION=E26KAJ3X9S922B
  BUCKET=cryptid-identity-com
elif [ ${STAGE} == "preprod" ]; then
  DISTRIBUTION=???
  BUCKET=explorer-preprod.identity.com
elif [ ${STAGE} == "dev" ]; then
  DISTRIBUTION=E32M643OD1ONGJ
  BUCKET=cryptid-dev-identity-com
fi

npx deploy-aws-s3-cloudfront --non-interactive --react --bucket ${BUCKET} --destination ${STAGE} --distribution ${DISTRIBUTION}
