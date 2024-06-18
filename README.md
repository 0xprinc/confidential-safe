## Description :
Distributing tokens from one safe to many safes confidentially:
1. Total tokens for distribution are sent to the baseEndpoint contract.
2. For distribution, an array of `{address, cipherAmount}` is sent to baseEndpoint, which forwards this data to Inco using Hyperlane. The corresponding amount of encryptedERC20 tokens is then minted to the recipient addresses.
3. When a recipient calls the claim function on baseEndpoint, their encryptedERC20 tokens are burned, and an equal amount of the original tokens is transferred to the recipient through baseEndpoint.

### Contracts architecture
<img width="981" alt="Screenshot 2024-06-17 at 18 11 57" src="https://github.com/0xprinc/confidential-safe/assets/82727098/c76dc4d8-3007-49f7-93cf-35569fc05e71">
