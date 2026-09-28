import { Alert, Linking } from 'react-native';
import { openDocument } from '../openDocument';

describe('document destinations', () => {
  const navigateToJob = jest.fn();
  const base = {
    id: 'file-id',
    filename: 'Contract.pdf',
    category: 'contracts',
    uploaded_at: '',
    starred: false,
  };
  beforeEach(() => jest.clearAllMocks());

  it('opens uploaded contract files instead of treating their IDs as job IDs', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    openDocument({
      doc: { ...base, public_url: 'https://example.invalid/signed-file.pdf' },
      navigateToJob,
    });
    expect(open).toHaveBeenCalledWith(
      'https://example.invalid/signed-file.pdf'
    );
    expect(navigateToJob).not.toHaveBeenCalled();
  });

  it('opens the contract viewer for a generated contract with a job reference', () => {
    openDocument({
      doc: { ...base, is_contract: true, job_id: 'job-id' },
      navigateToJob,
    });
    expect(navigateToJob).toHaveBeenCalledWith('job-id');
  });

  it('reports a missing job reference without navigating to a made-up job', () => {
    const alert = jest.spyOn(Alert, 'alert');
    openDocument({ doc: { ...base, is_contract: true }, navigateToJob });
    expect(alert).toHaveBeenCalled();
    expect(navigateToJob).not.toHaveBeenCalled();
  });
});
