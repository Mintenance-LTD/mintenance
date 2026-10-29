import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {ReportConversation} from '@/app/maintenance/reports/ReportConversation';
const id='00000000-0000-4000-8000-000000000001';
afterEach(()=>{cleanup();vi.unstubAllGlobals();sessionStorage.clear();history.replaceState(null,'','/');});
it('offers email recovery when a replaced private link is rejected',async()=>{
 history.replaceState(null,'',`/maintenance/reports/${id}#${'a'.repeat(64)}`);
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:403}));
 render(<ReportConversation reportId={id}/>);
 expect(await screen.findByText(/This private link is no longer valid/)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Recover access by email'})).toHaveAttribute('href',`/maintenance/report-access?reportId=${id}`);
});
it('does not describe a server failure as a revoked private link',async()=>{
 history.replaceState(null,'',`/maintenance/reports/${id}#${'a'.repeat(64)}`);
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
 render(<ReportConversation reportId={id}/>);
 await screen.findByRole('alert');
 expect(screen.queryByText(/This private link is no longer valid/)).not.toBeInTheDocument();
});
