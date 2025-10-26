import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test the read-contract endpoint with a simple ERC20 balance check
    const testData = {
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // USDC on Celo
      functionName: 'balanceOf',
      args: ['0x0000000000000000000000000000000000000000'], // Zero address for testing
      chainId: 42220 // Celo mainnet
    };

    const response = await fetch(`${request.nextUrl.origin}/api/read-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      test: 'Read contract endpoint test',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 