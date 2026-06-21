import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { Keypair } from 'stellar-sdk';
import { SupabaseService } from '../../../../src/database/supabase.client';
import { createTestKeypair, signMessage } from '../../../helpers';
import { createMockRegisterRequest } from '../../../fixtures';
import { buildTestApp, closeTestApp, InMemoryStore } from '../../helpers/test-setup';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockDb: InMemoryStore;
  let supabaseService: SupabaseService;
  let testWallets: string[] = [];
  let testUsernames: string[] = [];
  let originalFromPublicKey: any;

  beforeAll(async () => {
    const ctx = await buildTestApp();
    app = ctx.app;
    mockDb = ctx.mockDb;
    supabaseService = app.get(SupabaseService);
    originalFromPublicKey = Keypair.fromPublicKey;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (originalFromPublicKey) {
      Keypair.fromPublicKey = originalFromPublicKey;
    }
    mockDb.clear();
    testWallets = [];
    testUsernames = [];
  });

  describe('POST /auth/nonce', () => {
    it('should return nonce and expiresAt with valid wallet', async () => {
      const wallet = createTestKeypair().publicKey();
      testWallets.push(wallet);

      const response = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      expect(response.body).toHaveProperty('nonce');
      expect(response.body).toHaveProperty('expiresAt');
      expect(typeof response.body.nonce).toBe('string');
      expect(response.body.nonce).toHaveLength(64);
      expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 400 with invalid wallet format (too short)', async () => {
      await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet: 'G123' })
        .expect(400);
    });

    it('should return 400 with invalid wallet format (does not start with G)', async () => {
      await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet: 'XABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW' })
        .expect(400);
    });

    it('should return 400 with empty wallet', async () => {
      await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet: '' })
        .expect(400);
    });

    it('should return 400 with missing wallet field', async () => {
      await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({})
        .expect(400);
    });

    it('should return 400 with additional non-whitelisted fields', async () => {
      const wallet = createTestKeypair().publicKey();
      testWallets.push(wallet);

      await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet, extra: 'field' })
        .expect(400);
    });
  });

  describe('POST /auth/verify', () => {
    it('should return 400 with empty body', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({})
        .expect(400);
    });

    it('should return 400 with invalid wallet format', async () => {
      const nonce = 'a1b2c3d4e5f67890abcdef1234567890a1b2c3d4e5f67890abcdef1234567890';
      const signature = Buffer.alloc(64).toString('base64');

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet: 'INVALID', nonce, signature })
        .expect(400);
    });

    it('should return 400 with malformed nonce (too short)', async () => {
      const wallet = createTestKeypair().publicKey();
      const signature = Buffer.alloc(64).toString('base64');

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce: 'tooshort', signature })
        .expect(400);
    });

    it('should return 400 with missing signature field', async () => {
      const wallet = createTestKeypair().publicKey();
      const nonce = 'a1b2c3d4e5f67890abcdef1234567890a1b2c3d4e5f67890abcdef1234567890';

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce })
        .expect(400);
    });

    it('should return 401 when nonce does not exist in database', async () => {
      const wallet = createTestKeypair().publicKey();
      const nonce = 'a1b2c3d4e5f67890abcdef1234567890a1b2c3d4e5f67890abcdef1234567890';
      const signature = Buffer.alloc(64).toString('base64');

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(401);
    });

    it('should return 401 with invalid signature', async () => {
      const wallet = createTestKeypair().publicKey();
      testWallets.push(wallet);

      // First get a nonce
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const invalidSignature = Buffer.alloc(64).toString('base64');

      // Mock verify to return false
      Keypair.fromPublicKey = jest.fn(() => ({
        verify: jest.fn(() => false),
        publicKey: jest.fn(() => wallet),
      })) as any;

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature: invalidSignature })
        .expect(401);

      Keypair.fromPublicKey = originalFromPublicKey;
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full auth flow: nonce → verify → JWT tokens', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Step 1: Request nonce
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      expect(nonce).toHaveLength(64);

      // Step 2: Sign nonce and verify
      const signature = signMessage(keypair, nonce);
      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      // Should return JWT tokens
      expect(verifyResponse.body).toHaveProperty('accessToken');
      expect(verifyResponse.body).toHaveProperty('refreshToken');
      expect(verifyResponse.body).toHaveProperty('expiresIn');
      expect(verifyResponse.body).toHaveProperty('tokenType', 'Bearer');

      const { accessToken } = verifyResponse.body;

      // Step 3: Use JWT token in protected endpoint
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should prevent replay attacks with used nonces', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Get nonce
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      // First verify should succeed
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      // Second verify with same nonce should fail
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(401);
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user and return JWT tokens', async () => {
      const registerData = createMockRegisterRequest();
      testWallets.push(registerData.walletAddress);
      testUsernames.push(registerData.username);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('walletAddress', registerData.walletAddress);
      expect(response.body.user).toHaveProperty('username', registerData.username);
      expect(response.body.user).toHaveProperty('displayName', registerData.displayName);

      const { accessToken } = response.body;

      // Test auto-login with JWT
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 409 when wallet address already exists', async () => {
      const registerData = createMockRegisterRequest();
      testWallets.push(registerData.walletAddress);
      testUsernames.push(registerData.username);

      // Register first time
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      // Try to register again with same wallet
      const duplicateData = createMockRegisterRequest({
        walletAddress: registerData.walletAddress,
        username: `different_${Date.now()}`,
      });
      testUsernames.push(duplicateData.username);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateData)
        .expect(409);
    });

    it('should return 409 when username already exists', async () => {
      const registerData = createMockRegisterRequest();
      testWallets.push(registerData.walletAddress);
      testUsernames.push(registerData.username);

      // Register first time
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      // Try to register again with same username
      const duplicateData = createMockRegisterRequest({
        walletAddress: createTestKeypair().publicKey(),
        username: registerData.username,
      });
      testWallets.push(duplicateData.walletAddress);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateData)
        .expect(409);
    });

    it('should return 400 with invalid wallet format', async () => {
      const invalidData = createMockRegisterRequest({
        walletAddress: 'INVALID_WALLET',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 with invalid username format', async () => {
      const invalidData = createMockRegisterRequest({
        username: 'invalid username with spaces',
      });
      testWallets.push(invalidData.walletAddress);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 when terms not accepted', async () => {
      const invalidData = createMockRegisterRequest({
        termsAccepted: 'false',
      });
      testWallets.push(invalidData.walletAddress);
      testUsernames.push(invalidData.username);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('Database State Validation', () => {
    it('should create user record in database after successful registration', async () => {
      const registerData = createMockRegisterRequest();
      testWallets.push(registerData.walletAddress);
      testUsernames.push(registerData.username);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      // Verify database state
      const client = supabaseService.getServiceRoleClient();
      const { data: user } = await client
        .from('users')
        .select('*')
        .eq('wallet_address', registerData.walletAddress)
        .single();

      expect(user).toBeTruthy();
      expect(user.username).toBe(registerData.username);
      expect(user.display_name).toBe(registerData.displayName);
    });

    it('should create nonce record in database after nonce request', async () => {
      const wallet = createTestKeypair().publicKey();
      testWallets.push(wallet);

      const response = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      // Verify database state
      const client = supabaseService.getServiceRoleClient();
      const { data: nonce } = await client
        .from('nonces')
        .select('*')
        .eq('wallet_address', wallet)
        .eq('nonce', response.body.nonce)
        .single();

      expect(nonce).toBeTruthy();
      expect(nonce.used_at).toBeFalsy();
      expect(new Date(nonce.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('should mark nonce as used after successful verification', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Get nonce
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      // Verify
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      // Verify database state
      const client = supabaseService.getServiceRoleClient();
      const { data: nonceRecord } = await client
        .from('nonces')
        .select('*')
        .eq('wallet_address', wallet)
        .eq('nonce', nonce)
        .single();

      expect(nonceRecord.used_at).toBeTruthy();
    });

    it('should create session record after successful authentication', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Complete auth flow
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      // Verify database state
      const client = supabaseService.getServiceRoleClient();
      const { data: user } = await client
        .from('users')
        .select('id')
        .eq('wallet_address', wallet)
        .single();

      const { data: session } = await client
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      expect(session).toBeTruthy();
      expect(session.refresh_token_hash).toBeTruthy();
      expect(new Date(session.expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens on happy path (valid refresh token)', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Complete auth flow to get refresh token
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      const originalRefreshToken = verifyResponse.body.refreshToken;

      // Mock Date.now to advance time by 5 seconds
      const RealDateNow = Date.now;
      jest.spyOn(Date, 'now').mockImplementation(() => RealDateNow() + 5000);

      // Use refresh token to get new tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: originalRefreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body).toHaveProperty('expiresIn');
      expect(refreshResponse.body).toHaveProperty('tokenType', 'Bearer');

      // New tokens should be different from the original ones
      expect(refreshResponse.body.accessToken).not.toBe(verifyResponse.body.accessToken);
      expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);

      // New access token should work for protected endpoints
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);
    });

    it('should return 401 with an expired refresh token', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Complete auth flow to create a user in the database
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      // Create an expired refresh token signed with the same secret
      const configService = app.get(ConfigService);
      const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
      const expiredRefreshToken = jwt.sign(
        { wallet, type: 'refresh' },
        refreshSecret,
        { expiresIn: '0s' },
      );

      // Wait a moment to ensure the token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 on reuse of a refresh token (rotation detection)', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Get refresh token via verify
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      const refreshToken = verifyResponse.body.refreshToken;

      // Mock Date.now to advance time by 5 seconds so that the refreshed token has a different hash
      const RealDateNow = Date.now;
      jest.spyOn(Date, 'now').mockImplementation(() => RealDateNow() + 5000);

      // First use — should succeed
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Second use with the same token — should fail (session was deleted)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 with a malformed refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' })
        .expect(401);
    });

    it('should return 401 with an empty refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: '' })
        .expect(401);
    });

    it('should return 401 when refresh token has wrong type (access token instead of refresh token)', async () => {
      const keypair = createTestKeypair();
      const wallet = keypair.publicKey();
      testWallets.push(wallet);

      // Get an access token via verify
      const nonceResponse = await request(app.getHttpServer())
        .post('/auth/nonce')
        .send({ wallet })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const signature = signMessage(keypair, nonce);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ wallet, nonce, signature })
        .expect(200);

      const accessToken = verifyResponse.body.accessToken;

      // Try to use access token as refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401);
    });
  });
});
