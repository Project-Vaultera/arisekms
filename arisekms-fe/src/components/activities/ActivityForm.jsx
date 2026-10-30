import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { TARGET_AUDIENCES } from '@/lib/target-audiences.js';

export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'international-response', label: 'International response' },
  { value: 'youth', label: 'Youth' },
  { value: 'technical-assistance', label: 'Technical assistance' },
  { value: 'f2f-training', label: 'F2F training' },
  { value: 'skillsbuild', label: 'SkillsBuild' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'other', label: 'Other' },
];

// Shared manual-entry form: used by the Performance page dialog and the
// Activity page hero button. Manual entries feed the KPI cards after approval.
export function ActivityForm({ onSuccess }) {
  const [form, setForm] = useState({
    title: '', activityType: 'collaboration', targetAudience: '',
    happenedAt: '', youthCount: '', trainedCount: '', isInternational: false, notes: '',
  });
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e?.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        activityType: form.activityType,
        ...(form.targetAudience ? { targetAudience: form.targetAudience } : {}),
        ...(form.happenedAt ? { happenedAt: form.happenedAt } : {}),
        ...(form.youthCount !== '' ? { youthCount: Number(form.youthCount) } : {}),
        ...(form.trainedCount !== '' ? { trainedCount: Number(form.trainedCount) } : {}),
        isInternational: form.isInternational,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      };
      await api.post('/activities', payload);
      toast.success('Activity logged', { description: 'Pending review.' });
      onSuccess?.();
    } catch (err) {
      toast.error('Could not log activity', { description: err?.response?.data?.error?.message ?? err?.response?.data?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Youth DRM workshop — Cebu" />
      </div>
      <FilterSelect label="Activity type" value={form.activityType} onValueChange={(v) => set('activityType', v)} options={ACTIVITY_TYPE_OPTIONS} />
      <FilterSelect
        label="Target audience"
        value={form.targetAudience}
        onValueChange={(v) => set('targetAudience', v)}
        placeholder="— Select —"
        options={TARGET_AUDIENCES}
      />
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={form.happenedAt} onChange={(e) => set('happenedAt', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Youth count</Label>
        <Input type="number" min="0" value={form.youthCount} onChange={(e) => set('youthCount', e.target.value)} placeholder="0" />
      </div>
      <div className="space-y-1.5">
        <Label>Trained count (F2F)</Label>
        <Input type="number" min="0" value={form.trainedCount} onChange={(e) => set('trainedCount', e.target.value)} placeholder="0" />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox checked={form.isInternational} onCheckedChange={(v) => set('isInternational', v === true)} aria-label="International response" />
        <span className="text-sm">International response</span>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional context" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Submit for review'}</Button>
      </div>
    </form>
  );
}
