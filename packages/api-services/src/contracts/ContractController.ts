/**
 * Contract Controller - Handles all contract-related operations
 */
import { ContractService } from './ContractService';
import { logger } from '@mintenance/shared';
import { ContractLifecycleService } from './ContractLifecycleService';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<any>;
}
const NextResponse = {
  json(data: any, init?: ResponseInit): any {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};
interface User {
  id: string;
  email: string;
  role: string;
}
// Mock functions
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'test-user', email: 'test@example.com', role: 'homeowner' };
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // TODO: Implement CSRF check
}
async function checkRateLimit(request: NextRequest, options: any) {
  return { allowed: true };
}
function handleAPIError(error: any): any {
  logger.error('Contract API Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Mock Supabase
const serverSupabase = {} as any;
export class ContractController {
  private contractService: ContractService;
  private lifecycleService: ContractLifecycleService;
  constructor() {
    const config = {
      supabase: serverSupabase,
    };
    this.contractService = new ContractService(config);
    this.lifecycleService = new ContractLifecycleService(config);
  }
  /**
   * GET /api/contracts - List contracts
   */
  async listContracts(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const jobId = url.searchParams.get('jobId');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      // Get contracts based on user role
      const contracts = await this.contractService.listContracts(user, {
        status,
        jobId,
        limit,
        offset
      });
      return NextResponse.json(contracts);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/contracts - Create a new contract
   */
  async createContract(request: NextRequest): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000, // 1 hour
        maxRequests: 10, // 10 contracts per hour
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Only homeowners can create contracts
      if (user.role !== 'homeowner' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only homeowners can create contracts' },
          { status: 403 }
        );
      }
      // Parse request body
      const data = await request.json();
      // Create contract
      const contract = await this.contractService.createContract(data, user);
      return NextResponse.json({
        success: true,
        contractId: contract.id,
        message: 'Contract created successfully'
      }, { status: 201 });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/contracts/[contractId] - Get contract details
   */
  async getContract(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Get contract with authorization check
      const contract = await this.contractService.getContractById(
        params.contractId,
        user
      );
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(contract);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * PUT /api/contracts/[contractId] - Update contract
   */
  async updateContract(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const data = await request.json();
      // Update contract
      const contract = await this.contractService.updateContract(
        params.contractId,
        data,
        user
      );
      return NextResponse.json({
        success: true,
        message: 'Contract updated successfully',
        contract
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/contracts/[contractId]/sign - Sign a contract
   */
  async signContract(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000,
        maxRequests: 5,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const { signature, ipAddress } = await request.json();
      // Sign the contract
      const result = await this.lifecycleService.signContract(
        params.contractId,
        user,
        signature,
        ipAddress
      );
      return NextResponse.json({
        success: true,
        message: 'Contract signed successfully',
        signatureId: result.signatureId,
        contractStatus: result.contractStatus
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/contracts/[contractId]/activate - Activate a contract
   */
  async activateContract(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000,
        maxRequests: 5,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Activate the contract
      const contract = await this.lifecycleService.activateContract(
        params.contractId,
        user
      );
      return NextResponse.json({
        success: true,
        message: 'Contract activated successfully',
        contract
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/contracts/[contractId]/complete - Complete a contract
   */
  async completeContract(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000,
        maxRequests: 5,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const { completionNotes, rating } = await request.json();
      // Complete the contract
      const result = await this.lifecycleService.completeContract(
        params.contractId,
        user,
        completionNotes,
        rating
      );
      return NextResponse.json({
        success: true,
        message: 'Contract completed successfully',
        contract: result.contract,
        paymentReleased: result.paymentReleased
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/contracts/[contractId]/cancel - Cancel a contract
   */
  async cancelContract(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000,
        maxRequests: 5,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const { reason, refundAmount } = await request.json();
      // Cancel the contract
      const result = await this.lifecycleService.cancelContract(
        params.contractId,
        user,
        reason,
        refundAmount
      );
      return NextResponse.json({
        success: true,
        message: 'Contract cancelled',
        contract: result.contract,
        refundProcessed: result.refundProcessed
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/contracts/[contractId]/dispute - Create a dispute
   */
  async createDispute(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 86400000, // 24 hours
        maxRequests: 3, // 3 disputes per day
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const { reason, description, evidence } = await request.json();
      // Create dispute
      const dispute = await this.lifecycleService.createDispute(
        params.contractId,
        user,
        {
          reason,
          description,
          evidence
        }
      );
      return NextResponse.json({
        success: true,
        message: 'Dispute created successfully',
        disputeId: dispute.id
      }, { status: 201 });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/contracts/[contractId]/milestones - Get contract milestones
   */
  async getContractMilestones(
    request: NextRequest,
    { params }: { params: { contractId: string } }
  ): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Get milestones
      const milestones = await this.contractService.getContractMilestones(
        params.contractId,
        user
      );
      return NextResponse.json({
        milestones,
        total: milestones.length
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `${ip}:${request.url}`;
  }
  private rateLimitResponse(rateLimitResult: any): any {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitResult.limit || 30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  }
}
// Export singleton instance
export const contractController = new ContractController();
