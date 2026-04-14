import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { useApps, useCategories, useUpdateApp, useDeleteApp, useDeleteScreenshot } from '@/hooks/useApps';
import { App, Category, Screenshot } from '@/types/app';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';
import { PageLoader } from '@/components/PageLoader';

interface FinanceSummary {
  gross: number;
  developer: number;
  platform: number;
}

interface AdminWithdrawal {
  id: string;
  developer_id: string;
  amount: number;
  status: string;
  pi_wallet_address: string | null;
  pi_uid: string | null;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { data: apps, isLoading: appsLoading, refetch } = useApps();
  const { data: categories } = useCategories();
  
  const updateApp = useUpdateApp();
  const deleteApp = useDeleteApp();
  const deleteScreenshot = useDeleteScreenshot();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<(App & { category?: Category; screenshots?: Screenshot[] }) | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    website_url: '',
    category_id: '',
    tags: '',
    is_featured: false,
    is_popular: false,
    version: '1.0',
    developer_name: '',
    age_rating: '4+',
    whats_new: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({ gross: 0, developer: 0, platform: 0 });
  const [appFinanceRows, setAppFinanceRows] = useState<Array<{ app_id: string; app_name: string; gross: number; developer: number; platform: number }>>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<AdminWithdrawal[]>([]);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [a2uUid, setA2uUid] = useState('');
  const [a2uAmount, setA2uAmount] = useState('');
  const [a2uMemo, setA2uMemo] = useState('');
  const [a2uSending, setA2uSending] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    loadFinanceData();
  }, [isAdmin, user]);

  const loadFinanceData = async () => {
    const { data: earningsData } = await supabase
      .from('developer_earnings')
      .select('app_id, total_amount, developer_share, platform_fee');

    const appIds = [...new Set((earningsData || []).map((e) => e.app_id))];
    const { data: appNames } = appIds.length
      ? await supabase.from('apps').select('id, name').in('id', appIds)
      : { data: [] };
    const appNameMap = new Map((appNames || []).map((a) => [a.id, a.name]));

    const grouped: Record<string, { app_id: string; app_name: string; gross: number; developer: number; platform: number }> = {};
    for (const row of earningsData || []) {
      if (!grouped[row.app_id]) {
        grouped[row.app_id] = {
          app_id: row.app_id,
          app_name: appNameMap.get(row.app_id) || 'Unknown App',
          gross: 0,
          developer: 0,
          platform: 0,
        };
      }
      grouped[row.app_id].gross += Number(row.total_amount || 0);
      grouped[row.app_id].developer += Number(row.developer_share || 0);
      grouped[row.app_id].platform += Number(row.platform_fee || 0);
    }
    const rows = Object.values(grouped);
    setAppFinanceRows(rows);
    setFinanceSummary({
      gross: rows.reduce((s, r) => s + r.gross, 0),
      developer: rows.reduce((s, r) => s + r.developer, 0),
      platform: rows.reduce((s, r) => s + r.platform, 0),
    });

    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id, developer_id, amount, status, pi_wallet_address, created_at')
      .order('created_at', { ascending: false });
    setWithdrawalRequests((withdrawals || []) as AdminWithdrawal[]);
  };

  const updateWithdrawalStatus = async (id: string, status: 'completed' | 'rejected') => {
    setProcessingWithdrawalId(id);
    try {
      const payload: Record<string, any> = { status };
      if (status === 'completed') {
        payload.processed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('withdrawal_requests')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      toast.success(`Withdrawal ${status}`);
      await loadFinanceData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update withdrawal');
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const handleA2uSend = async () => {
    if (!a2uUid.trim() || !a2uAmount.trim() || !a2uMemo.trim()) {
      toast.error('Fill in all A2U fields');
      return;
    }
    const amount = parseFloat(a2uAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setA2uSending(true);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/pi-a2u-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userUid: a2uUid.trim(),
          amount,
          memo: a2uMemo.trim(),
          metadata: { type: 'admin_a2u', sent_by: user?.id },
          supabaseUserId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'A2U payment failed');
      toast.success(`Sent ${amount} Pi! TxID: ${data.txid?.slice(0, 12)}...`);
      setA2uUid('');
      setA2uAmount('');
      setA2uMemo('');
    } catch (err: any) {
      toast.error(err.message || 'A2U payment failed');
    } finally {
      setA2uSending(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tagline: '',
      description: '',
      website_url: '',
      category_id: '',
      tags: '',
      is_featured: false,
      is_popular: false,
      version: '1.0',
      developer_name: '',
      age_rating: '4+',
      whats_new: '',
      status: 'pending',
    });
    setEditingApp(null);
  };

  const openEditDialog = (app: App & { category?: Category; screenshots?: Screenshot[] }) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      tagline: app.tagline || '',
      description: app.description || '',
      website_url: app.website_url,
      category_id: app.category_id || '',
      tags: app.tags?.join(', ') || '',
      is_featured: app.is_featured,
      is_popular: app.is_popular,
      version: app.version,
      developer_name: app.developer_name || '',
      age_rating: app.age_rating || '4+',
      whats_new: app.whats_new || '',
      status: app.status || 'pending',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    setIsSubmitting(true);
    try {
      await updateApp.mutateAsync({
        id: editingApp.id,
        name: formData.name,
        tagline: formData.tagline || null,
        description: formData.description || null,
        website_url: formData.website_url,
        category_id: formData.category_id || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        is_featured: formData.is_featured,
        is_popular: formData.is_popular,
        version: formData.version,
        developer_name: formData.developer_name || null,
        age_rating: formData.age_rating,
        whats_new: formData.whats_new || null,
        status: formData.status,
      });
      
      toast.success('App updated successfully');
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateApp.mutateAsync({ id, status: 'approved' });
      toast.success('App approved');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateApp.mutateAsync({ id, status: 'rejected' });
      toast.success('App rejected');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    
    try {
      await deleteApp.mutateAsync(id);
      toast.success('App deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteScreenshot = async (id: string) => {
    try {
      await deleteScreenshot.mutateAsync(id);
      toast.success('Screenshot deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredApps = apps?.filter(app => {
    if (activeTab === 'all') return true;
    return app.status === activeTab;
  }) || [];

  const pendingCount = apps?.filter(a => a.status === 'pending').length || 0;

  if (loading || !isAdmin) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage and approve submitted apps</p>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            All Apps
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'approved' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'rejected' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Apps List */}
        {appsLoading ? (
          <PageLoader label="Loading apps..." fullscreen={false} />
        ) : filteredApps.length > 0 ? (
          <div className="space-y-4">
            {filteredApps.map((app) => (
              <div key={app.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card">
                <AppIcon src={app.logo_url} name={app.name} size="md" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{app.name}</h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{app.tagline}</p>
                  <p className="text-xs text-muted-foreground">
                    by {app.developer_name || 'Unknown'} • {app.category?.name || 'Uncategorized'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {app.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(app.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(app.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(app)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(app.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No apps found</p>
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-card p-4 border border-border">
            <p className="text-xs text-muted-foreground">Total Paid Income</p>
            <p className="text-2xl font-bold text-foreground">{financeSummary.gross.toFixed(2)} pi</p>
          </div>
          <div className="rounded-2xl bg-card p-4 border border-border">
            <p className="text-xs text-muted-foreground">Developer Share (70%)</p>
            <p className="text-2xl font-bold text-foreground">{financeSummary.developer.toFixed(2)} pi</p>
          </div>
          <div className="rounded-2xl bg-card p-4 border border-border">
            <p className="text-xs text-muted-foreground">Platform Fee (30%)</p>
            <p className="text-2xl font-bold text-foreground">{financeSummary.platform.toFixed(2)} pi</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-card p-4 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Earnings by App</h2>
          {appFinanceRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid earnings yet.</p>
          ) : (
            <div className="space-y-2">
              {appFinanceRows.map((row) => (
                <div key={row.app_id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                  <div>
                    <p className="font-medium text-foreground">{row.app_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross: {row.gross.toFixed(2)} pi | Platform: {row.platform.toFixed(2)} pi
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">{row.developer.toFixed(2)} pi</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-card p-4 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Withdrawal Payouts</h2>
          {withdrawalRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdrawal requests.</p>
          ) : (
            <div className="space-y-3">
              {withdrawalRequests.map((w) => {
                const devPayout = Number(w.amount);
                const gross = devPayout / 0.7;
                const platformFee = gross - devPayout;
                const parts = (w.pi_wallet_address || '').split('|').map(s => s.trim());
                const openPayUser = parts[0] || '—';
                const openPayAcct = parts[1] || '—';

                return (
                  <div key={w.id} className="rounded-xl bg-secondary/50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{devPayout.toFixed(2)} Pi <span className="text-xs font-normal text-muted-foreground">(Dev Payout)</span></p>
                        <p className="text-xs text-muted-foreground">
                          Gross: {gross.toFixed(2)} Pi &middot; Platform Fee (30%): {platformFee.toFixed(2)} Pi
                        </p>
                        <p className="text-xs text-muted-foreground">
                          OpenPay: <span className="font-medium text-foreground">{openPayUser}</span> &middot; Acct: <span className="font-medium text-foreground">{openPayAcct}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString()} &middot; Dev ID: <span className="font-mono text-[10px]">{w.developer_id.slice(0, 8)}…</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={w.status === 'completed' ? 'default' : w.status === 'pending' ? 'secondary' : 'destructive'}>
                          {w.status}
                        </Badge>
                        {w.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={processingWithdrawalId === w.id}
                              onClick={() => updateWithdrawalStatus(w.id, 'completed')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processingWithdrawalId === w.id}
                              onClick={() => updateWithdrawalStatus(w.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* A2U Payment - Send Pi to Users */}
        <div className="mt-6 rounded-2xl bg-card p-4 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Send Pi to User (A2U)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Send Pi directly from the app wallet to a user using the Pi A2U payment flow.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Pi User UID</Label>
              <Input
                value={a2uUid}
                onChange={(e) => setA2uUid(e.target.value)}
                placeholder="User's Pi UID"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (Pi)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={a2uAmount}
                onChange={(e) => setA2uAmount(e.target.value)}
                placeholder="e.g. 3.14"
              />
            </div>
            <div className="space-y-2">
              <Label>Memo</Label>
              <Input
                value={a2uMemo}
                onChange={(e) => setA2uMemo(e.target.value)}
                placeholder="e.g. Withdrawal payout"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleA2uSend} disabled={a2uSending}>
              {a2uSending ? 'Sending...' : 'Send Pi'}
            </Button>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit App</DialogTitle>
            <DialogDescription>
              Update the details for this app.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">App Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="developer_name">Developer Name</Label>
                  <Input
                    id="developer_name"
                    value={formData.developer_name}
                    onChange={(e) => setFormData({ ...formData, developer_name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age_rating">Age Rating</Label>
                  <Select
                    value={formData.age_rating}
                    onValueChange={(value) => setFormData({ ...formData, age_rating: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4+">4+</SelectItem>
                      <SelectItem value="9+">9+</SelectItem>
                      <SelectItem value="12+">12+</SelectItem>
                      <SelectItem value="17+">17+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whats_new">What's New</Label>
                  <Textarea
                    id="whats_new"
                    value={formData.whats_new}
                    onChange={(e) => setFormData({ ...formData, whats_new: e.target.value })}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'pending' | 'approved' | 'rejected') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="is_featured" className="text-base">Featured App</Label>
                    <p className="text-sm text-muted-foreground">Display prominently on the homepage</p>
                  </div>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="is_popular" className="text-base">Popular App</Label>
                    <p className="text-sm text-muted-foreground">Show in the "Top Apps" section</p>
                  </div>
                  <Switch
                    id="is_popular"
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                  />
                </div>

                {/* Screenshots */}
                {editingApp?.screenshots && editingApp.screenshots.length > 0 && (
                  <div className="space-y-2">
                    <Label>Screenshots</Label>
                    <div className="flex flex-wrap gap-2">
                      {editingApp.screenshots.map((ss) => (
                        <div key={ss.id} className="relative group">
                          <img
                            src={ss.image_url}
                            alt="Screenshot"
                            className="h-24 w-40 rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteScreenshot(ss.id)}
                            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-600 text-white">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
}
