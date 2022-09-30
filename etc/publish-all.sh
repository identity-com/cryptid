echo Updating to version $1

set -u
set -e

echo Publishing cryptid-idl@$1
(cd packages/client/idl && yarn publish --tag alpha --new-version $1 --no-git-tag-version)

echo Publishing cryptid-core@$1
(cd packages/client/core \
  && yarn add @identity.com/cryptid-idl@$1 \
  && yarn publish --tag alpha --new-version $1 --no-git-tag-version \
)

echo Publishing cryptid-middleware-check-pass@$1
(cd packages/client/middleware/checkPass \
  && yarn add @identity.com/cryptid-core@$1 \
  && yarn publish --tag alpha --new-version $1 --no-git-tag-version \
)

echo Publishing cryptid-middleware-time-delay@$1
(cd packages/client/middleware/timeDelay \
  && yarn add @identity.com/cryptid-core@$1 \
  && yarn publish --tag alpha --new-version $1 --no-git-tag-version \
)

echo Publishing cryptid-middleware-check-recipient@$1
(cd packages/client/middleware/checkRecipient \
  && yarn add @identity.com/cryptid-core@$1 \
  && yarn publish --tag alpha --new-version $1 --no-git-tag-version \
)

echo Publishing cryptid@$1
(cd packages/client/cryptid \
  && yarn add @identity.com/cryptid-core@$1 \
    @identity.com/cryptid-middleware-check-pass@$1 \
    @identity.com/cryptid-middleware-time-delay@$1 \
    @identity.com/cryptid-middleware-check-recipient@$1 \
  && yarn publish --tag alpha --new-version $1 --no-git-tag-version \
)

(cd packages/tests \
  && yarn add @identity.com/cryptid-idl@$1 @identity.com/cryptid@$1 \
  && yarn add @identity.com/cryptid@$1 --no-git-tag-version \
)

(cd packages/client/cli \
  && yarn add @identity.com/cryptid@$1 --no-git-tag-version \
)
