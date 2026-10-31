import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { stripToPhone } from './validation.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_TYPES = ['Primary', 'Billing', 'Technical', 'Authorized Representative', 'Other'];

function serverMessage(err, fallback) {
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    fallback
  );
}

const EMPTY_CONTACT = {
  title: '', firstName: '', middleName: '', lastName: '', position: '',
  email: '', phone: '', contactType: 'Billing', sameAsRegistered: false,
  country: '', province: '', city: '', street: '', zip: '',
};

function ContactFields({ draft, setD }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label className="text-sm">Title</Label><Input value={draft.title ?? ''} onChange={(e) => setD('title')(e.target.value)} /></div>
      <FilterSelect
        label="Contact Type"
        value={draft.contactType || 'Billing'}
        onValueChange={setD('contactType')}
        options={CONTACT_TYPES}
      />
      <div className="space-y-1.5"><Label className="text-sm">First Name *</Label><Input value={draft.firstName ?? ''} onChange={(e) => setD('firstName')(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-sm">Middle Name</Label><Input value={draft.middleName ?? ''} onChange={(e) => setD('middleName')(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-sm">Last Name *</Label><Input value={draft.lastName ?? ''} onChange={(e) => setD('lastName')(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-sm">Position</Label><Input value={draft.position ?? ''} onChange={(e) => setD('position')(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input value={draft.email ?? ''} onChange={(e) => setD('email')(e.target.value)} type="email" /></div>
      <div className="space-y-1.5"><Label className="text-sm">Phone</Label><Input value={draft.phone ?? ''} onChange={(e) => setD('phone')(stripToPhone(e.target.value))} inputMode="tel" /></div>
    </div>
  );
}

function AddressFields({ draft, setD, required }) {
  return (
    <>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          checked={!!draft.sameAsRegistered}
          onCheckedChange={(v) => setD('sameAsRegistered')(v === true)}
          aria-label="Address same as registered"
        />
        <span className="text-sm">Address same as the registered company address</span>
      </div>
      {!draft.sameAsRegistered && (
        <>
          <div className="space-y-1.5"><Label className="text-sm">Country{required ? ' *' : ''}</Label><Input value={draft.country ?? ''} onChange={(e) => setD('country')(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm">Province / State</Label><Input value={draft.province ?? ''} onChange={(e) => setD('province')(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm">City{required ? ' *' : ''}</Label><Input value={draft.city ?? ''} onChange={(e) => setD('city')(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm">Post / ZIP Code{required ? ' *' : ''}</Label><Input value={draft.zip ?? ''} onChange={(e) => setD('zip')(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-sm">Street{required ? ' *' : ''}</Label><Input value={draft.street ?? ''} onChange={(e) => setD('street')(e.target.value)} /></div>
        </>
      )}
    </>
  );
}

// Self-contained primary-contact view + editor. Saves immediately via the
// contacts API and reports the refreshed profile through onSaved.
export function PrimaryContactEditor({ companyId, primary, onSaved, editable, showDraftWarning }) {
  const [contact, setContact] = useState({ ...EMPTY_CONTACT, isPrimary: true });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const setP = (key) => (value) => setContact((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    setContact(primary ? { ...EMPTY_CONTACT, ...primary } : { ...EMPTY_CONTACT, isPrimary: true });
  }, [primary?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!contact.firstName?.trim() || !contact.lastName?.trim()) {
      toast.error('First and last name are required');
      return false;
    }
    if (!contact.email || !EMAIL_RE.test(contact.email)) {
      toast.error('A valid email is required');
      return false;
    }
    if (!companyId) {
      toast.error('Start your membership application first');
      return false;
    }
    setSaving(true);
    try {
      const payload = { ...contact, isPrimary: true };
      const res = primary?.id
        ? await api.patch(`/companies/${companyId}/contacts/${primary.id}`, payload)
        : await api.post(`/companies/${companyId}/contacts`, payload);
      onSaved(res.data.data);
      setEditing(false);
      toast.success('Primary contact saved');
      return true;
    } catch (err) {
      toast.error('Could not save contact', { description: serverMessage(err) });
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        {primary ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{[primary.title, primary.firstName, primary.middleName, primary.lastName].filter(Boolean).join(' ')}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Position</dt><dd className="font-medium">{primary.position || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="truncate font-medium">{primary.email || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{primary.phone || '—'}</dd></div>
          </dl>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">No primary contact yet.</p>
        )}
        {editable && (
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {primary ? 'Edit' : 'Add'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
        <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label className="text-sm">Title</Label><Input value={contact.title ?? ''} onChange={(e) => setP('title')(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Position</Label><Input value={contact.position ?? ''} onChange={(e) => setP('position')(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-sm">First Name *</Label><Input value={contact.firstName ?? ''} onChange={(e) => setP('firstName')(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Middle Name</Label><Input value={contact.middleName ?? ''} onChange={(e) => setP('middleName')(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Last Name *</Label><Input value={contact.lastName ?? ''} onChange={(e) => setP('lastName')(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input value={contact.email ?? ''} onChange={(e) => setP('email')(e.target.value)} type="email" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Phone *</Label><Input value={contact.phone ?? ''} onChange={(e) => setP('phone')(stripToPhone(e.target.value))} inputMode="tel" /></div>
        <AddressFields draft={contact} setD={setP} required />
      </div>
      {showDraftWarning && (
        <p className="rounded-sm bg-[var(--sendai-teal)]/10 px-3 py-2 text-xs text-[var(--sendai-teal)]">
          Saving will return your approved application to draft for re-review.
        </p>
      )}
    </div>
  );
}

// Self-contained additional-contacts table + add/edit dialog.
export function AdditionalContactsTable({ companyId, contacts, onChanged, editable }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ ...EMPTY_CONTACT });
  const [saving, setSaving] = useState(false);
  const setD = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  function openAdd() {
    setEditing(null);
    setDraft({ ...EMPTY_CONTACT });
    setDialogOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setDraft({ ...EMPTY_CONTACT, ...c });
    setDialogOpen(true);
  }

  async function saveDialog() {
    if (!draft.firstName?.trim() || !draft.lastName?.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!draft.email || !EMAIL_RE.test(draft.email)) {
      toast.error('A valid email is required');
      return;
    }
    if (!draft.contactType) {
      toast.error('Contact type is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, isPrimary: false };
      const res = editing
        ? await api.patch(`/companies/${companyId}/contacts/${editing.id}`, payload)
        : await api.post(`/companies/${companyId}/contacts`, payload);
      onChanged(res.data.data);
      setDialogOpen(false);
      toast.success(editing ? 'Contact updated' : 'Contact added');
    } catch (err) {
      toast.error('Could not save contact', { description: serverMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      const res = await api.delete(`/companies/${companyId}/contacts/${id}`);
      onChanged(res.data.data);
      toast.success('Contact removed');
    } catch {
      toast.error('Could not remove contact');
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{contacts.length} contact(s)</p>
        {editable && (
          <Button size="sm" onClick={openAdd}>
            <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={2} />
            Add contact
          </Button>
        )}
      </div>
      {contacts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No additional contacts yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                {editable && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.position || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contactType || '—'}</TableCell>
                  {editable && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-[var(--sendai-crimson)]" onClick={() => remove(c.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit contact' : 'Add contact'}</DialogTitle>
          </DialogHeader>
          <ContactFields draft={draft} setD={setD} />
          <div className="mt-3">
            <AddressFields draft={draft} setD={setD} required={false} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDialog} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
