/**
 * TEST COMPONENT - React Query Hooks Verification
 *
 * This component tests all the React Query hooks to ensure they work correctly.
 * To use this component:
 *
 * 1. Create a test page: app/test-queries/page.tsx
 * 2. Import this component: import { QueryTestComponent } from '@/lib/hooks/queries/__test-component';
 * 3. Render it: <QueryTestComponent />
 * 4. Navigate to /test-queries in your browser
 * 5. Check that all hooks load data correctly
 *
 * DELETE THIS FILE after verification!
 */

'use client';

import { useState } from 'react';
import {
  useJobs,
  useJob,
  useContractors,
  useProfile,
  useAuth,
  useConversations,
} from './index';

export function QueryTestComponent() {
  const [testJobId, setTestJobId] = useState<string | null>(null);
  const [testContractorId, setTestContractorId] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">React Query Hooks Test</h1>
      <p className="text-gray-600">
        This page tests all React Query hooks. Check browser console and React Query DevTools.
      </p>

      <TestSection title="1. Authentication (useAuth)">
        <AuthTest />
      </TestSection>

      <TestSection title="2. Profile (useProfile)">
        <ProfileTest />
      </TestSection>

      <TestSection title="3. Jobs (useJobs)">
        <JobsTest onSelectJob={setTestJobId} />
      </TestSection>

      {testJobId && (
        <TestSection title="4. Single Job (useJob)">
          <JobTest jobId={testJobId} />
        </TestSection>
      )}

      <TestSection title="5. Contractors (useContractors)">
        <ContractorsTest onSelectContractor={setTestContractorId} />
      </TestSection>

      {testContractorId && (
        <TestSection title="6. Contractor Profile (useContractor)">
          <ContractorTest contractorId={testContractorId} />
        </TestSection>
      )}

      <TestSection title="7. Conversations (useConversations)">
        <ConversationsTest />
      </TestSection>

      <div className="bg-green-50 border border-green-200 p-4 rounded">
        <h3 className="font-semibold text-green-800">✅ All hooks loaded!</h3>
        <p className="text-sm text-green-700 mt-1">
          Check React Query DevTools (bottom-right icon) to see cached data.
        </p>
      </div>
    </div>
  );
}

function TestSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function AuthTest() {
  const { isAuthenticated, isLoading, isContractor, isHomeowner, user } = useAuth();

  if (isLoading) return <TestLoading />;

  return (
    <div className="space-y-2">
      <TestResult label="Authenticated" value={isAuthenticated} />
      <TestResult label="Is Contractor" value={isContractor} />
      <TestResult label="Is Homeowner" value={isHomeowner} />
      {user && <TestResult label="User Name" value={`${user.first_name} ${user.last_name}`} />}
    </div>
  );
}

function ProfileTest() {
  const { data: user, isLoading, error } = useProfile();

  if (isLoading) return <TestLoading />;
  if (error) return <TestError error={error} />;
  if (!user) return <div>No user data</div>;

  return (
    <div className="space-y-2">
      <TestResult label="User ID" value={user.id} />
      <TestResult label="Email" value={user.email} />
      <TestResult label="Role" value={user.role} />
    </div>
  );
}

function JobsTest({ onSelectJob }: { onSelectJob: (id: string) => void }) {
  const { data, isLoading, error } = useJobs({ limit: 5 });

  if (isLoading) return <TestLoading />;
  if (error) return <TestError error={error} />;

  return (
    <div>
      <TestResult label="Jobs Count" value={data?.jobs?.length || 0} />
      {data?.jobs && data.jobs.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.jobs.slice(0, 3).map((job: any) => (
            <div
              key={job.id}
              className="text-sm p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => onSelectJob(job.id)}
            >
              📋 {job.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobTest({ jobId }: { jobId: string }) {
  const { data: job, isLoading, error } = useJob(jobId);

  if (isLoading) return <TestLoading />;
  if (error) return <TestError error={error} />;
  if (!job) return <div>No job found</div>;

  return (
    <div className="space-y-2">
      <TestResult label="Job Title" value={job.title} />
      <TestResult label="Job ID" value={job.id} />
      <TestResult label="Status" value={job.status} />
    </div>
  );
}

function ContractorsTest({ onSelectContractor }: { onSelectContractor: (id: string) => void }) {
  const { data, isLoading, error } = useContractors({ limit: 5 });

  if (isLoading) return <TestLoading />;
  if (error) return <TestError error={error} />;

  return (
    <div>
      <TestResult label="Contractors Count" value={data?.contractors?.length || 0} />
      {data?.contractors && data.contractors.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.contractors.slice(0, 3).map((contractor: any) => (
            <div
              key={contractor.id}
              className="text-sm p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => onSelectContractor(contractor.id)}
            >
              👷 {contractor.first_name} {contractor.last_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractorTest({ contractorId }: { contractorId: string }) {
  const { data: contractor, isLoading, error } = useContractors();

  if (isLoading) return <TestLoading />;
  if (error) return <TestError error={error} />;
  if (!contractor) return <div>No contractor found</div>;

  return (
    <div className="space-y-2">
      <TestResult label="Contractor ID" value={contractorId} />
      <TestResult label="Name" value={`${(contractor as any).first_name || 'N/A'}`} />
    </div>
  );
}

function ConversationsTest() {
  const { data: conversations, isLoading, error } = useConversations();

  if (isLoading) return <TestLoading />;
  if (error) return <TestError error={error} />;

  return (
    <div>
      <TestResult label="Conversations Count" value={conversations?.length || 0} />
    </div>
  );
}

function TestLoading() {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      Loading...
    </div>
  );
}

function TestError({ error }: { error: Error }) {
  return (
    <div className="text-red-600 text-sm">
      ❌ Error: {error.message}
    </div>
  );
}

function TestResult({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-sm">
      <span className="font-medium">{label}:</span>{' '}
      <span className="text-gray-700">
        {typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : value}
      </span>
    </div>
  );
}
