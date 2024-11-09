// services/fido2.service.js
const { Fido2Lib } = require('fido2-lib');
const crypto = require('crypto');
const SecurityKey = require('../models/securityKeys.model');
const Challenge = require('../models/challenge.model');
const ApiError = require('../utils/errors');
const auditService = require('./audit.service');
const base64url = require('base64url');
const KeyAssignment = require('../models/keyAssignment.model');

class Fido2Service {
  constructor() {
    this.f2l = new Fido2Lib({
      timeout: 60000,
      rpId: process.env.RPID,
      rpName: "SecureVault Pro",
      challengeSize: 32,
      attestation: "direct",
      cryptoParams: [-7, -257],
      authenticatorAttachment: "platform",
      authenticatorRequireResidentKey: false,
      authenticatorUserVerification: "preferred"
    });
  }

  async generateRegistrationOptions(user) {
    try {
      const registrationOptions = await this.f2l.attestationOptions();
      registrationOptions.user = {
        id: user.id,
        name: user.email,
        displayName: user.displayName
      };

      const challengeBase64 = base64url.encode(Buffer.from(registrationOptions.challenge));
      await this._storeChallenge(user.id, challengeBase64, 'registration');
      const options = {
        ...registrationOptions,
        challenge: challengeBase64,
        user: {
          ...registrationOptions.user,
          id: base64url(registrationOptions.user.id)
        }
      };

      return options;
    } catch (error) {
      console.error('Error generating registration options:', error);
      throw error;
    }
  }

  async verifyRegistration(attestationResponse, userId) {
    try {

      const expectedChallenge = await this._getStoredChallenge(userId, 'registration');
      if (!expectedChallenge) {
        throw new ApiError(400, 'Challenge not found or expired');
      }

      // Convert Buffer to ArrayBuffer
      const bufferToArrayBuffer = (buffer) => {
        return Uint8Array.from(buffer).buffer;
      };

      // Prepare attestation data with correct ArrayBuffer format
      const attestation = {
        id: bufferToArrayBuffer(base64url.toBuffer(attestationResponse.id)),
        rawId: bufferToArrayBuffer(base64url.toBuffer(attestationResponse.rawId)),
        response: {
          clientDataJSON: bufferToArrayBuffer(base64url.toBuffer(attestationResponse.response.clientDataJSON)),
          attestationObject: bufferToArrayBuffer(base64url.toBuffer(attestationResponse.response.attestationObject))
        },
        type: attestationResponse.type
      };

      const attestationExpectations = {
        challenge: expectedChallenge,
        origin: process.env.ORIGIN,
        factor: "either"
      };

      const regResult = await this.f2l.attestationResult(
        attestation,
        attestationExpectations
      );

      // Generate a serial number
      const serialNumber = `FT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      // Convert aaguid to string if it exists
      let aaguidString = null;
      const aaguid = regResult.authnrData.get("aaguid");
      if (aaguid) {
        if (aaguid instanceof ArrayBuffer) {
          aaguidString = Buffer.from(aaguid).toString('hex');
        } else if (typeof aaguid === 'string') {
          aaguidString = aaguid;
        }
      }
      const userHandle = base64url.encode(attestation.rawId);
      // Create security key record
      const securityKey = new SecurityKey({
        serialNumber,
        credentialId: attestationResponse.id,
        publicKey: regResult.authnrData.get("credentialPublicKeyPem"),
        aaguid: aaguidString,
        userId: userId,
        userHandle : userHandle
      });

      await securityKey.save();

      const securityNewKey = await SecurityKey.findById(securityKey._id);
      const assignment = await securityNewKey.assign(userId, userId);
      await this._removeChallenge(userId, 'registration');
      await auditService.createAuditLog({
        action: 'KEY_REGISTERED',
        performedBy: userId,
        resourceId: securityNewKey._id,
        details: {
          credentialId: securityKey.credentialId,
          timestamp: new Date()
        }
      });

      await auditService.createAuditLog({
        action: 'KEY_ASSIGNED',
        performedBy: userId,
        resourceId: assignment._id,
        details: {
          credentialId: assignment._id,
          timestamp: new Date()
        }
      });

      return securityKey;
    } catch (error) {
      console.error('Verification error:', error);
      throw new ApiError(500, `Error verifying registration: ${error.message}`);
    }
  }

  // Add helper methods for buffer conversions
  _bufferToArrayBuffer(buffer) {
    return Uint8Array.from(buffer).buffer;
  }

  async generateAuthenticationOptions(userId) {
    try {
      const activeAssignments = await KeyAssignment.find({
        userId: userId,
        status: 'active'
      });

      if (!activeAssignments.length) {
        throw new ApiError(400, 'No security keys assigned to this user');
      }

      // Get the security keys
      const securityKeys = await SecurityKey.find({
        _id: { $in: activeAssignments.map(assignment => assignment.keyId) },
        status: 'assigned'
      });

      if (!securityKeys.length) {
        throw new ApiError(400, 'No active security keys found');
      }

      let assertionOptions = await this.f2l.assertionOptions();

      assertionOptions.allowCredentials = securityKeys.map(key => ({
        type: 'public-key',
        id: key.credentialId,
        transports: ['usb', 'nfc', 'ble']
      }));
      // Convert challenge to string for storage

      const challengeBase64 = base64url.encode(Buffer.from(assertionOptions.challenge));
      await this._storeChallenge(userId, challengeBase64, 'authentication');
      // Use string challenge in response
      assertionOptions.challenge = challengeBase64;

      return assertionOptions;
    } catch (error) {
      throw new ApiError(500, 'Error generating authentication options: ' + error.message);
    }
  }

  async verifyAuthentication(assertionResponse, userId) {
    try {
      const expectedChallenge = await this._getStoredChallenge(userId, 'authentication');
      if (!expectedChallenge) {
        throw new ApiError(400, 'Challenge not found or expired');
      }


      const securityKey = await SecurityKey.findOne({
        credentialId: assertionResponse.id,
        status: 'assigned'
      }).populate('currentAssignment').lean();



      if (!securityKey) {
        throw new ApiError(404, 'Security key not found');
      }

      if (securityKey.currentAssignment.userId.toString() != userId.toString()) {
        throw new ApiError(404, 'Security key not found');
      }

      // Convert challenge back to ArrayBuffer
      const challenge = Uint8Array.from(base64url.toBuffer(expectedChallenge));

      const bufferToArrayBuffer = (buffer) => {
        return Uint8Array.from(buffer).buffer;
      };

      const assertion = {
        id: bufferToArrayBuffer(base64url.toBuffer(assertionResponse.rawId)),    // Convert id to ArrayBuffer
        rawId: bufferToArrayBuffer(base64url.toBuffer(assertionResponse.rawId)), // Convert rawId to ArrayBuffer
        response: {
            clientDataJSON: bufferToArrayBuffer(base64url.toBuffer(assertionResponse.response.clientDataJSON)),
            authenticatorData: bufferToArrayBuffer(base64url.toBuffer(assertionResponse.response.authenticatorData)),
            signature: bufferToArrayBuffer(base64url.toBuffer(assertionResponse.response.signature)),
            userHandle: null
        },
        type: 'public-key'
    };

      // Prepare expectations
      const assertionExpectations = {
        challenge: challenge,
        origin: process.env.ORIGIN,
        factor: "either",
        publicKey: securityKey.publicKey,
        prevCounter: securityKey.signCount,
        userHandle: null
      };


      const result = await this.f2l.assertionResult(
        assertion,
        assertionExpectations
      );


      await this._removeChallenge(userId, 'authentication');

      await auditService.createAuditLog({
        action: 'KEY_AUTHENTICATED',
        performedBy: userId,
        resourceId: securityKey._id,
        details: { timestamp: new Date() }
      });

      return true;
    } catch (error) {
      throw new ApiError(500, 'Error verifying authentication: ' + error.message);
    }
  }

  _bufferToArrayBuffer(buffer) {
    return Uint8Array.from(buffer).buffer;
  }

  async _storeChallenge(userId, challenge, type) {
    try {
      // Challenge should already be in base64url format
      await Challenge.deleteMany({ userId, type });

      await Challenge.create({
        userId,
        challenge, // Store as is - already base64url
        type
      });
    } catch (error) {
      console.error('Error storing challenge:', error);
      throw new ApiError(500, 'Failed to store challenge');
    }
  }

  async _getStoredChallenge(userId, type) {
    try {
      const challengeDoc = await Challenge.findOne({ userId, type });
      if (!challengeDoc) return null;

      // Return the challenge as is - it's already in base64url format
      return challengeDoc.challenge;
    } catch (error) {
      console.error('Error retrieving challenge:', error);
      throw new ApiError(500, 'Failed to retrieve challenge');
    }
  }

  async _removeChallenge(userId, type) {
    await Challenge.deleteMany({ userId, type });
  }

  async cleanupChallenges() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await Challenge.deleteMany({ createdAt: { $lt: fiveMinutesAgo } });
  }
}

module.exports = new Fido2Service();