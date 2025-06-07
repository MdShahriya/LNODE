// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for external fund collection pool
interface IFundCollectionPool {
    function deposit(uint256 amount) external;
}

contract NFTGenarator is ERC721A, Ownable {
    uint256 public constant MAX_SUPPLY = 10000;

    // ERC20 token used for payment (set on deployment)
    IERC20 public immutable paymentToken;
    // External pool contract for collecting funds
    IFundCollectionPool public immutable fundPool;

    // Track per-address mint status
    mapping(address => bool) public hasMinted;

    constructor(
        address _paymentToken,
        address _fundPool
    ) ERC721A("Topay OG Card", "TOG") Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token address");
        require(_fundPool != address(0), "Invalid pool address");
        paymentToken = IERC20(_paymentToken);
        fundPool = IFundCollectionPool(_fundPool);
    }

    /**
     * @notice Public mint: 1 NFT per address, funds go to external pool
     * @param amount Amount of paymentToken to deposit (calculated by frontend)
     */
    function mint(uint256 amount) external {
        require(totalSupply() + 1 <= MAX_SUPPLY, "All NFTs minted");
        require(!hasMinted[msg.sender], "Only one mint per address");
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from user to this contract
        bool ok = paymentToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "Payment transfer failed");

        // Approve and deposit into external fund pool
        paymentToken.approve(address(fundPool), amount);
        fundPool.deposit(amount);

        // Mark minted and mint NFT
        hasMinted[msg.sender] = true;
        _safeMint(msg.sender, 1);
    }

    /**
     * @notice Owner mint: unlimited quantity without payment
     * @param quantity Number of NFTs to mint
     */
    function ownerMint(uint256 quantity) external onlyOwner {
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        _safeMint(owner(), quantity);
    }

    /**
     * @notice Withdraw any ERC20 tokens accidentally sent to this contract
     * @param token Address of the token to withdraw
     */
    function rescueTokens(address token) external onlyOwner {
        require(token != address(paymentToken), "Cannot withdraw payment token");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to rescue");
        IERC20(token).transfer(owner(), balance);
    }

    /**
     * @notice Token URI for metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Query for nonexistent token");
        return string(abi.encodePacked(
            "https://img.topayfoundation.com/metadata/",
            _toString(tokenId),
            ".json"
        ));
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
