Feature: Create sender and recipient cryptid accounts and do transfers between accounts

    Scenario: Create recipient account
        Given I open to cryptid home page
        When I type wallet Alias name of 'recipient'
        When I create recipient new key
        Then Wallet is created
        Then Wallet cryptid address is copied
        Then Wallet did address is copied

    Scenario: Airdrop 1 solana to wallet
        Given Wallet is created
        When I select localnet
        When I airdrop solana to cryptid wallet address
        When I airdrop solana to did address


#    Scenario: Add controller to cryptid
#        When Controller is added

    Scenario: Add additional cryptid account
        When I import account with alias of 'recipient2'
        Given I open to cryptid home page
#        When I type wallet Alias name of 'mitch'
#        When I create sender new key
#        Then Wallet is created
#
#    Scenario: Send transaction to recipient
#        Given Wallet is created
#        When I airdrop solana to cryptid wallet address
#        When I airdrop solana to did address
#        When I send 1 solana to recipient address
#        Then Solana balance of '4.0000' is confirmed
#
#    Scenario: Switch to recipient account and confirm balance
#        Given Solana balance of '4.0000' is confirmed
#        When I switch to account named 'mitch-mobile'
#        Then Solana balance of '6.0000' is confirmed


#    Scenario: Add a controller from first wallet to new wallet
#        Given I open to cryptid home page
#        When I type wallet Alias name
#        When I create second new key
#        Then Wallet is created
#        When Controller from first wallet is added
