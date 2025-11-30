import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '../backend/data');

function readDataFile(filename: string) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

export async function GET() {
    try {
        const poolsPath = path.join(process.cwd(), '../backend/data/simple_testnet_pools.json');

        if (!fs.existsSync(poolsPath)) {
            return NextResponse.json({ pools: [], totalDeployed: 0 });
        }

        const data = fs.readFileSync(poolsPath, 'utf-8');
        const poolsData = JSON.parse(data);

        return NextResponse.json(poolsData);
    } catch (error) {
        console.error('Error loading testnet pools:', error);
        return NextResponse.json({ pools: [], totalDeployed: 0 });
    }
}
