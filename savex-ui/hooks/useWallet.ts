import { useState, useEffect } from 'react';
import { isAllowed, setAllowed, requestAccess } from '@stellar/freighter-api';

export function useWallet() {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        async function checkFreighter() {
            // Check if freighter is installed (it injects itself into window)
            // @ts-ignore
            if (window.freighter) {
                setIsInstalled(true);
                if (await isAllowed()) {
                    const { address } = await requestAccess();
                    setPublicKey(address);
                }
            }
        }
        checkFreighter();
    }, []);

    const connect = async () => {
        if (!isInstalled) {
            setError("Freighter wallet is not installed");
            return;
        }

        try {
            await setAllowed();
            const { address } = await requestAccess();
            setPublicKey(address);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const disconnect = () => {
        setPublicKey(null);
    };

    return { publicKey, error, isInstalled, connect, disconnect };
}
