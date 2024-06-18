### Description :
Facilitating confidential token distribution from a single safe to multiple safes:

- The total tokens for distribution are first sent to the baseEndpoint contract and then wrapped into encryptedERC20 tokens on the incoEndpoint.
- During distribution, an array containing `{address, cipherAmount}` is transmitted to baseEndpoint. This data is subsequently relayed to Inco using hyperlane, enabling the transfer of corresponding amounts of encryptedERC20 tokens to the recipients.
- Upon calling the claim function on baseEndpoint, recipients burn their encryptedERC20 tokens, prompting the baseEndpoint to transfer an equivalent amount of original tokens to the recipient.

### Contracts architecture
<img width="910" alt="Screenshot 2024-06-17 at 20 10 32" src="https://github.com/0xprinc/confidential-safe/assets/82727098/d2e9d801-609c-45ba-bce6-4ca4eeee11a1">
