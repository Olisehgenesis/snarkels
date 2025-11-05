import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from '@selfxyz/core';

const prisma = new PrismaClient();

// Define verification requirements (must match frontend)
const verification_config = {
  excludedCountries: [],
  ofac: false,
  minimumAge: 18,
};

// Create the configuration store
const configStore = new DefaultConfigStore(verification_config);

// Initialize the verifier
const selfBackendVerifier = new SelfBackendVerifier(
  process.env.NEXT_PUBLIC_SELF_SCOPE || 'snarkels-verification',
  process.env.NEXT_PUBLIC_SELF_ENDPOINT || 'https://snarkels.lol/api/verification/self',
  false,
  AllIds,
  configStore,
  'hex'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attestationId, proof, publicSignals, userContextData, userAddress } = body;

    // Log received data for debugging (remove sensitive data in production)
    console.log('Verification request received:', {
      hasAttestationId: !!attestationId,
      hasProof: !!proof,
      hasPublicSignals: !!publicSignals,
      hasUserContextData: !!userContextData,
      hasUserAddress: !!userAddress,
      userContextDataType: typeof userContextData,
      userContextDataLength: typeof userContextData === 'string' ? userContextData.length : 'N/A'
    });

    // Verify required fields are present
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      console.error('Missing required fields:', {
        proof: !!proof,
        publicSignals: !!publicSignals,
        attestationId: !!attestationId,
        userContextData: !!userContextData
      });
      return NextResponse.json({
        message: "Proof, publicSignals, attestationId, and userContextData are required",
      }, { status: 400 });
    }

    // Extract user address from userContextData if not provided directly
    // userContextData contains the userId (wallet address in hex format) when userIdType is 'hex'
    let extractedAddress = userAddress;
    
    if (!extractedAddress && userContextData) {
      // userContextData is a hex string containing the userId (wallet address)
      // Try to extract address from userContextData
      let addressFromContext: string | null = null;
      
      if (typeof userContextData === 'string') {
        // If it's a string, check if it's a hex address
        const cleaned = userContextData.trim();
        if (cleaned.startsWith('0x')) {
          addressFromContext = cleaned.toLowerCase();
        } else {
          // Try adding 0x prefix
          addressFromContext = `0x${cleaned}`.toLowerCase();
        }
        
        // Validate it looks like an Ethereum address (42 chars including 0x)
        if (addressFromContext.length === 42 && /^0x[a-f0-9]{40}$/i.test(addressFromContext)) {
          extractedAddress = addressFromContext;
        } else {
          console.warn('userContextData does not appear to be a valid Ethereum address:', {
            length: addressFromContext.length,
            format: addressFromContext.substring(0, 10) + '...'
          });
        }
      } else {
        console.warn('userContextData is not a string:', typeof userContextData);
      }
    }

    // Ensure we have an address to work with
    if (!extractedAddress) {
      console.error('Could not extract user address from request:', {
        userAddressProvided: !!userAddress,
        userContextDataType: typeof userContextData,
        userContextDataSample: typeof userContextData === 'string' ? userContextData.substring(0, 50) : userContextData
      });
      return NextResponse.json({
        message: "User address is required. Provide userAddress or ensure userContextData contains a valid Ethereum address.",
        debug: {
          userAddressProvided: !!userAddress,
          userContextDataReceived: !!userContextData
        }
      }, { status: 400 });
    }

    console.log('Using extracted address:', extractedAddress);

    // Verify the proof
    const result = await selfBackendVerifier.verify(
      attestationId,    // Document type (1 = passport, 2 = EU ID card)
      proof,            // The zero-knowledge proof
      publicSignals,    // Public signals array
      userContextData   // User context data
    );

    // Check if verification was successful
    if (result.isValidDetails.isValid) {
      // Verification successful - process the result
      const disclosedData = result.discloseOutput;
      
      try {
        // Find or create user by wallet address
        let user = await prisma.user.findUnique({
          where: { address: extractedAddress }
        });

        if (!user) {
          // Create new user if they don't exist
          user = await prisma.user.create({
            data: {
              address: extractedAddress,
              isVerified: true,
              verificationMethod: 'self_protocol',
              verifiedAt: new Date(),
            }
          });
        } else {
          // Update existing user's verification status
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isVerified: true,
              verificationMethod: 'self_protocol',
              verifiedAt: new Date(),
            }
          });
        }

        // Save verification attempt - stringify proofData for SQLite compatibility
        await prisma.verificationAttempt.create({
          data: {
            userId: user.id,
            verificationType: 'self_protocol',
            status: 'success',
            proofData: JSON.stringify({
              attestationId,
              disclosedData,
              verificationResult: result
            }),
            verifiedAt: new Date(),
          }
        });

        // Extract and save age and country data if available
        if (disclosedData) {
          const updateData: any = {};
          const data = disclosedData as any; // Type assertion for dynamic data
          
          // Extract age if available (check for minimumAge verification)
          if (data.minimumAge !== undefined) {
            // If minimumAge is verified as 18+, we know the user is at least 18
            updateData.dateOfBirth = new Date(Date.now() - (18 * 365 * 24 * 60 * 60 * 1000));
          }
          
          // Extract country if available - check multiple possible property names
          const country = data.issuingState || data.issuing_state || data.country;
          if (country) {
            updateData.country = country;
          }
          
          // Update user with extracted data
          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data: updateData
            });
          }
        }

        return NextResponse.json({
          status: "success",
          result: true,
          credentialSubject: disclosedData,
          userId: user.id,
          message: "Verification successful and saved to database"
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json({
          status: "error",
          result: false,
          message: "Verification successful but failed to save to database",
          credentialSubject: disclosedData,
        }, { status: 500 });
      }
    } else {
      // Verification failed
      return NextResponse.json({
        status: "error",
        result: false,
        message: "Verification failed",
        details: result.isValidDetails,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({
      status: "error",
      result: false,
      message: "Internal server error",
    }, { status: 500 });
  }
}
