#!/usr/bin/env bash
set -e
set -u

if [ "${STAGE}" == "prod" ]; then
  DISTRIBUTION=E2S4Y0ZV7EAMWM
  BUCKET=cryptid.identity.com
elif [ ${STAGE} == "preprod" ]; then
  DISTRIBUTION=???
  BUCKET=explorer-preprod.identity.com
elif [ ${STAGE} == "dev" ]; then
  DISTRIBUTION=E1SU4WO39BJJ5E
  BUCKET=cryptid-dev.identity.com
fi

npx deploy-aws-s3-cloudfront --non-interactive --react --bucket ${BUCKET} --destination ${STAGE} --distribution ${DISTRIBUTION}
