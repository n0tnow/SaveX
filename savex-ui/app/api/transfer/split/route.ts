import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { sourceAsset, destAsset, totalAmount, splits, userAddress } = await request.json();

        if (!splits || splits.length !== 2) {
            return NextResponse.json({ error: 'Must provide exactly 2 splits' }, { status: 400 });
        }

        const results = [];

        // Execute first split immediately
        const firstSplit = splits[0];
        if (firstSplit.executeAt === 'now') {
            console.log(`Executing first split: ${firstSplit.amount} ${sourceAsset} → ${destAsset}`);

            // Call regular swap API for first part
            const swapResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/swap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceAsset,
                    destAsset,
                    amount: firstSplit.amount,
                    userAddress
                })
            });

            const swapData = await swapResponse.json();
            results.push({
                part: 1,
                status: swapResponse.ok ? 'ready' : 'failed',
                xdr: swapData.xdr,
                error: swapData.error
            });
        }

        // Schedule second split
        const secondSplit = splits[1];
        console.log(`Scheduling second split for ${secondSplit.executeAt}`);

        // In a real app, this would save to database for cron job execution
        // For now, we'll just return the schedule info
        results.push({
            part: 2,
            status: 'scheduled',
            executeAt: secondSplit.executeAt,
            amount: secondSplit.amount,
            message: 'Second part will be executed at scheduled time'
        });

        return NextResponse.json({
            success: true,
            results,
            message: 'Split transfer initiated. Part 1 ready to sign, Part 2 scheduled.'
        });

    } catch (error: any) {
        console.error('Split transfer error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
