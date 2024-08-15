# DeFi Swap and Supply Script

## Overview of Script

This script demonstrates the integration of multiple DeFi protocols, specifically Uniswap and Aave, to execute a more sophisticated financial operation on the Ethereum Sepolia testnet.

### Workflow:

1. **Token Swap on Uniswap:**
   - The script begins by swapping USDC for LINK using Uniswap V3. 
   - It interacts with the Uniswap V3 smart contracts to approve the USDC token, retrieve pool information, and execute the swap. The user receives the equivalent amount of LINK in return.

2. **Supply LINK to Aave:**
   - After the swap is completed, the script supplies the acquired LINK tokens to Aave's lending pool.
   - The script approves the spending of LINK and deposits it into Aave, allowing the user to earn interest on their supplied LINK.

### DeFi Protocols Involved:

- **Uniswap V3:** A decentralized exchange protocol used for swapping tokens without the need for an intermediary.
- **Aave:** A decentralized money market protocol where users can lend and borrow a variety of assets.

This script showcases the composability of DeFi protocols, where assets obtained from one protocol can seamlessly be used in another for additional financial benefits.

## Diagram Illustration

The following diagram illustrates the sequence of steps and interactions between Uniswap and Aave in the script.

![Diagram](./Image.png)

- **User Initiates Token Swap:** The user initiates a swap from USDC to LINK on Uniswap.
- **Uniswap Smart Contract:** Manages the approval, pool information retrieval, and execution of the token swap.
- **User Supplies LINK to Aave:** The user supplies the received LINK to Aave for earning interest.
- **Aave Smart Contract:** Handles the approval of LINK spending and its deposit into Aave's lending pool.

This diagram provides a visual representation of how the script interacts with the different protocols to achieve the desired financial operation.


# Code Explanation

## Overview

This section offers a detailed explanation of the code, highlighting key functions, the underlying logic, and how interactions with the DeFi protocols (Uniswap and Aave) are handled.

## Key Functions and Logic

### 1. **approveToken Function**

```javascript
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(
      approveTransaction
    );
    console.log("Sending Approval Transaction...");
    console.log(`Transaction Sent: ${transactionResponse.hash}`);
    const receipt = await transactionResponse.wait();
    console.log(`Approval Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.hash}`);
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}




**Explanation:**
- This function approves a specified amount of a token (e.g., USDC) so that it can be used in a swap by another smart contract, such as Uniswap's Swap Router.
- It initializes a contract instance using the token's address, ABI, and the user's wallet.
- The function then prepares and sends an approval transaction, allowing the Swap Router to spend the tokens on behalf of the user.

### 2. **getPoolInfo Function**

```javascript
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000
  );
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}
```

**Explanation:**
- This function retrieves information about a Uniswap V3 liquidity pool based on the input and output tokens (USDC and LINK).
- It queries the Uniswap Factory contract to obtain the pool address, then creates a contract instance for the pool.
- The function returns key details about the pool, such as the addresses of the tokens involved and the fee tier.

### 3. **prepareSwapParams Function**

```javascript
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}
```

**Explanation:**
- This function prepares the necessary parameters for executing a token swap on Uniswap V3.
- It includes details such as the input and output tokens, the fee tier, and the recipient of the swapped tokens.
- The parameters are returned as an object that will be used in the swap transaction.

### 4. **executeSwap Function**

```javascript
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );
  const receipt = await signer.sendTransaction(transaction);
  console.log(`Receipt: https://sepolia.etherscan.io/tx/${receipt.hash}`);
}
```

**Explanation:**
- This function executes the token swap on Uniswap V3 using the prepared parameters.
- It uses the Uniswap Swap Router contract to create a swap transaction and then sends it to the blockchain.
- The function logs the transaction receipt, allowing the user to verify the swap on Etherscan.

### 5. **Supply LINK to Aave Functionality**

```javascript
async function supplyLinkToAave(linkAmount) {
  const aaveLendingPool = new ethers.Contract(
    AAVE_LENDING_POOL_ADDRESS,
    AAVE_LENDING_POOL_ABI,
    signer
  );

  await approveToken(LINK.address, LINK_ABI, linkAmount, signer);

  const supplyTransaction = await aaveLendingPool.deposit(
    LINK.address,
    linkAmount,
    signer.address,
    0
  );
  const receipt = await supplyTransaction.wait();
  console.log(`Supplied LINK to Aave: https://sepolia.etherscan.io/tx/${receipt.hash}`);
}
```

**Explanation:**
- This function allows the user to supply LINK tokens to the Aave lending pool after acquiring them from the Uniswap swap.
- It first approves the Aave lending pool contract to spend the user's LINK tokens.
- It then deposits the approved LINK into the Aave lending pool, enabling the user to earn interest on the supplied assets.

### 6. **Main Function**

```javascript
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );
    await executeSwap(swapRouter, params, signer);
    
    // Supply LINK to Aave
    await supplyLinkToAave(amountIn);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}
```

**Explanation:**
- This is the main function that orchestrates the entire process.
- It starts by converting the specified swap amount into the appropriate unit, then carries out the USDC-to-LINK swap on Uniswap.
- After the swap, it automatically supplies the acquired LINK to Aave, allowing the user to earn interest.
- This function ties together all the key components of the script, demonstrating the composability of DeFi protocols.

## Summary

This DeFi script demonstrates how to leverage the composability of various DeFi protocols like Uniswap and Aave. It guides users through swapping assets and earning interest on them, all while interacting with decentralized smart contracts on the Ethereum Sepolia testnet.
```

