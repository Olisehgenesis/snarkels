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
    const { attestationId, proof, publicSignals, userContextData, userAddress } = await request.json();

    // Verify all required fields are present
    if (!proof || !publicSignals || !attestationId || !userContextData || !userAddress) {
      return NextResponse.json({
        message: "Proof, publicSignals, attestationId, userContextData, and userAddress are required",
      }, { status: 400 });
    }

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
          where: { address: userAddress }
        });

        if (!user) {
          // Create new user if they don't exist
          user = await prisma.user.create({
            data: {
              address: userAddress,
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

        // Save verification attempt
        await prisma.verificationAttempt.create({
          data: {
            userId: user.id,
            verificationType: 'self_protocol',
            status: 'success',
            proofData: {
              attestationId,
              disclosedData,
              verificationResult: result
            },
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
