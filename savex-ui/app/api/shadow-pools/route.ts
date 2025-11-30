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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');

    const data = readDataFile('selected_pools_500.json');

    if (!data) {
        return NextResponse.json(
            { error: 'Pools not found. Run backend setup first.' },
            { status: 404 }
        );
    }

    let pools = data.selectedPools;

    // Filter by category
    if (category) {
        pools = pools.filter((p: any) => p.category === category);
    }

    // Pagination
    const paginatedPools = pools.slice(offset, offset + limit);

    return NextResponse.json({
        total: pools.length,
        limit,
        offset,
        pools: paginatedPools,
        statistics: data.statistics,
    });
}
