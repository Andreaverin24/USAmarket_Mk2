'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { request } from '../../lib/api';

interface Application {
  id: string;
  organizationId: string;
  legalBusinessName: string;
  publicDealerName: string;
  businessType: string;
  website?: string;
  email: string;
  phone: string;
  businessAddress: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: 'US';
  };
  contactPerson: string;
  companyDescription: string;
  specialties: string[];
  yearsInBusiness: number;
  status: string;
  reviewReason?: string;
  version: number;
}

export default function DealerOnboardingPage() {
  const [application, setApplication] = useState<Application>();
  const [message, setMessage] = useState('Loading application…');

  async function load() {
    try {
      const rows = await request<Application[]>('/dealer-applications/mine');
      setApplication(rows[0]);
      setMessage(rows.length ? '' : 'Create a dealer application to begin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load application.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = {
      legalBusinessName: String(form.get('legalBusinessName')),
      publicDealerName: String(form.get('publicDealerName')),
      businessType: String(form.get('businessType')),
      website: String(form.get('website')) || undefined,
      email: String(form.get('email')),
      phone: String(form.get('phone')),
      businessAddress: {
        line1: String(form.get('line1')),
        city: String(form.get('city')),
        region: String(form.get('region')),
        postalCode: String(form.get('postalCode')),
        countryCode: 'US' as const,
      },
      contactPerson: String(form.get('contactPerson')),
      companyDescription: String(form.get('companyDescription')),
      specialties: String(form.get('specialties'))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      yearsInBusiness: Number(form.get('yearsInBusiness')),
      supportingDocuments: [],
    };
    try {
      if (application) {
        await request(`/organizations/${application.organizationId}/dealer-application`, {
          method: 'PATCH',
          body: JSON.stringify({ ...fields, version: application.version }),
        });
      } else {
        await request('/dealer-applications', {
          method: 'POST',
          body: JSON.stringify({
            ...fields,
            organizationName: String(form.get('organizationName')),
            organizationSlug: String(form.get('organizationSlug')),
          }),
        });
      }
      setMessage('Application saved.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save application.');
    }
  }

  async function submitForReview() {
    if (!application) return;
    try {
      await request(`/organizations/${application.organizationId}/dealer-application/submit`, {
        method: 'POST',
        body: JSON.stringify({ version: application.version }),
      });
      setMessage('Application submitted for review.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit application.');
    }
  }

  const editable = !application || ['DRAFT', 'CHANGES_REQUESTED'].includes(application.status);
  return (
    <main className="portal-page">
      <header>
        <div>
          <p className="eyebrow">DecorFlavor · Dealer onboarding</p>
          <h1>Professional dealer application</h1>
        </div>
        <Link href="/products">Seller catalog</Link>
      </header>
      {application ? (
        <section className="status-card">
          <strong>Status: {application.status}</strong>
          {application.reviewReason ? <p>Review feedback: {application.reviewReason}</p> : null}
        </section>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      <form className="operations-form" onSubmit={save}>
        {!application ? (
          <>
            <label>
              Organization name
              <input name="organizationName" defaultValue="Guild Candidate Gallery" required />
            </label>
            <label>
              Organization slug
              <input name="organizationSlug" defaultValue="guild-candidate-gallery" required />
            </label>
          </>
        ) : null}
        <label>
          Legal business name
          <input
            name="legalBusinessName"
            defaultValue={application?.legalBusinessName}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Public dealer name
          <input
            name="publicDealerName"
            defaultValue={application?.publicDealerName}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Business type
          <input
            name="businessType"
            defaultValue={application?.businessType ?? 'LLC'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Website
          <input
            name="website"
            type="url"
            defaultValue={application?.website}
            disabled={!editable}
          />
        </label>
        <label>
          Business email
          <input
            name="email"
            type="email"
            defaultValue={application?.email ?? 'dealer@example.com'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            defaultValue={application?.phone ?? '+1 212 555 0100'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Address
          <input
            name="line1"
            defaultValue={application?.businessAddress.line1 ?? '100 Design Avenue'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          City
          <input
            name="city"
            defaultValue={application?.businessAddress.city ?? 'New York'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          State
          <input
            name="region"
            defaultValue={application?.businessAddress.region ?? 'NY'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          ZIP
          <input
            name="postalCode"
            defaultValue={application?.businessAddress.postalCode ?? '10013'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Contact person
          <input
            name="contactPerson"
            defaultValue={application?.contactPerson ?? 'Dealer Owner'}
            disabled={!editable}
            required
          />
        </label>
        <label>
          Years in business
          <input
            name="yearsInBusiness"
            type="number"
            min="0"
            defaultValue={application?.yearsInBusiness ?? 5}
            disabled={!editable}
            required
          />
        </label>
        <label className="wide">
          Specialties, comma separated
          <input
            name="specialties"
            defaultValue={
              application?.specialties.join(', ') ?? 'Vintage furniture, Decorative arts'
            }
            disabled={!editable}
            required
          />
        </label>
        <label className="wide">
          Company description
          <textarea
            name="companyDescription"
            defaultValue={
              application?.companyDescription ??
              'Independent American dealer specializing in documented vintage furniture and collectible design.'
            }
            disabled={!editable}
            minLength={40}
            required
          />
        </label>
        {editable ? <button type="submit">Save application</button> : null}
        {application && editable ? (
          <button type="button" onClick={() => void submitForReview()}>
            Submit for review
          </button>
        ) : null}
      </form>
    </main>
  );
}
