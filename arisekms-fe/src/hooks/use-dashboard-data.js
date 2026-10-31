import { useCallback, useEffect, useState } from 'react';

import { api } from '@/api/client.js';
import { buildHeatmapColumns, HEATMAP_WEEKS } from '@/lib/heatmap-data.js';
import { buildWeeklySubmissions, SUBMISSION_WEEKS } from '@/lib/weekly-submissions.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthBuckets(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], active: 0, inactive: 0, reports: 0, knowledge: 0, certificates: 0 };
  });
}

function bucketize(rows, buckets, dateOf, field) {
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const row of rows ?? []) {
    const raw = dateOf(row);
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (b) b[field] += 1;
  }
  return buckets;
}

function toRecent(reports, knowledge, certificates, limit = 8) {
  const rows = [
    ...(reports ?? []).map((r) => ({
      id: `report-${r.id}`,
      refId: r.id,
      type: 'Report',
      title: r.originalName ?? `Report #${r.id}`,
      fileName: r.originalName ?? `report-${r.id}`,
      fileUrl: `/reports/${r.id}/file`,
      status: r.status,
      date: r.createdAt,
      actor: r.author?.name ?? r.author?.username ?? '—',
    })),
    ...(knowledge ?? []).map((k) => ({
      id: `knowledge-${k.id}`,
      refId: k.id,
      type: 'Knowledge',
      title: k.title ?? `Document #${k.id}`,
      fileName: k.originalName ?? `${k.title ?? 'document'}.pdf`,
      fileUrl: `/knowledge/${k.id}/file`,
      status: k.category,
      date: k.createdAt,
      actor: k.author?.name ?? k.author?.username ?? '—',
    })),
    ...(certificates ?? []).map((c) => ({
      id: `certificate-${c.id}`,
      refId: c.id,
      type: 'Certificate',
      title: c.course ?? `Certificate #${c.id}`,
      status: c.status,
      date: c.createdAt,
      actor: c.memberName ?? c.submittedBy?.name ?? '—',
    })),
  ];
  return rows
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

// Single dashboard fetch: list endpoints expose totals via meta.count, so one
// request per resource feeds cards + charts + activity. Reports use limit=100
// to back the 26-week heatmap.
// shortcut: capped samples (100 rows); add server-side aggregates + search
// (?status, monthly buckets) when membership outgrows it.
export function useDashboardData() {
  const [state, setState] = useState({
    counts: null,
    membersByMonth: monthBuckets(),
    submissionsByMonth: monthBuckets(),
    heatmapColumns: [],
    weeklySubmissions: [],
    recent: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [usersRes, reportsRes, knowledgeRes, certsRes] = await Promise.all([
        api.get('/users', { params: { limit: 100, offset: 0 } }),
        api.get('/reports', { params: { limit: 100, offset: 0 } }),
        api.get('/knowledge', { params: { limit: 10, offset: 0 } }),
        api.get('/certificates', { params: { limit: 10, offset: 0 } }),
      ]);
      const users = usersRes.data.data ?? [];
      const reports = reportsRes.data.data ?? [];
      const knowledge = knowledgeRes.data.data ?? [];
      const certificates = certsRes.data.data ?? [];
      const active = users.filter((u) => !u.isAccountDisabled).length;
      const inactive = users.length - active;

      const members = monthBuckets();
      bucketize(users.filter((u) => !u.isAccountDisabled), members, (u) => u.createdAt, 'active');
      bucketize(users.filter((u) => u.isAccountDisabled), members, (u) => u.createdAt, 'inactive');

      const submissions = monthBuckets();
      bucketize(reports, submissions, (r) => r.createdAt, 'reports');
      bucketize(knowledge, submissions, (k) => k.createdAt, 'knowledge');
      bucketize(certificates, submissions, (c) => c.createdAt, 'certificates');

      setState({
        counts: {
          users: usersRes.data.meta?.count ?? users.length,
          active,
          inactive,
          reports: reportsRes.data.meta?.count ?? reports.length,
          knowledge: knowledgeRes.data.meta?.count ?? knowledge.length,
          certificates: certsRes.data.meta?.count ?? certificates.length,
        },
        membersByMonth: members,
        submissionsByMonth: submissions,
        recent: toRecent(reports, knowledge, certificates),
        heatmapColumns: buildHeatmapColumns(reports, HEATMAP_WEEKS),
        weeklySubmissions: buildWeeklySubmissions(reports, SUBMISSION_WEEKS),
        users,
        loading: false,
        error: null,
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Could not load dashboard data' }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
