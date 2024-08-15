require("dotenv").config();
const { ethers } = require("ethers");
const { abi: ERC20_ABI } = require("./abis/erc20.json");
const { abi: UNISWAP_ROUTER_ABI } = require("./abis/uniswap_router.json");
const { abi: AAVE_LENDING_POOL_ABI } = require("./abis/aave_lending_pool.json");

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract addresses on Sepolia Testnet
const USDC_ADDRESS = "0xINSERT_USDC_CONTRACT_ADDRESS";
const LINK_ADDRESS = "0xINSERT_LINK_CONTRACT_ADDRESS";
const UNISWAP_ROUTER_ADDRESS = "0xINSERT_UNISWAP_ROUTER_ADDRESS";
const AAVE_LENDING_POOL_ADDRESS = "0xINSERT_AAVE_LENDING_POOL_ADDRESS";

// Uniswap Swap Function
async function swapUSDCForLINK(amountIn) {
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
    const swapRouter = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, wallet);

    // Approve Uniswap Router to spend USDC
    console.log("Approving USDC for Uniswap Swap...");
    await usdcContract.approve(UNISWAP_ROUTER_ADDRESS, amountIn);

    // Prepare swap parameters
    const params = {
        tokenIn: USDC_ADDRESS,
        tokenOut: LINK_ADDRESS,
        fee: 3000, // Uniswap pool fee tier (0.3%)
        recipient: wallet.address,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };

    // Execute Swap
    console.log("Executing swap on Uniswap...");
    const transaction = await swapRouter.exactInputSingle(params);
    const receipt = await transaction.wait();
    console.log(`Swap Transaction: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);

    return receipt.logs[0].args.amountOut;
}

// Aave Supply Function
async function supplyLINKToAave(amount) {
    const linkContract = new ethers.Contract(LINK_ADDRESS, ERC20_ABI, wallet);
    const lendingPool = new ethers.Contract(AAVE_LENDING_POOL_ADDRESS, AAVE_LENDING_POOL_ABI, wallet);

    // Approve Aave LendingPool to spend LINK
    console.log("Approving LINK for Aave supply...");
    await linkContract.approve(AAVE_LENDING_POOL_ADDRESS, amount);

    // Supply LINK to Aave
    console.log("Supplying LINK to Aave...");
    const transaction = await lendingPool.deposit(LINK_ADDRESS, amount, wallet.address, 0);
    const receipt = await transaction.wait();
    console.log(`Supply Transaction: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
}

// Main Function
async function main() {
    const usdcAmount = ethers.utils.parseUnits("10", 6); // Specify the USDC amount (e.g., 10 USDC)

    try {
        // Swap USDC for LINK on Uniswap
        const linkAmount = await swapUSDCForLINK(usdcAmount);

        // Supply LINK to Aave
        await supplyLINKToAave(linkAmount);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main().catch(console.error);
