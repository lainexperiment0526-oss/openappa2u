import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePiNetwork } from '@/hooks/usePiNetwork';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

interface EarningsSummary {
  app_id: string;
  app_name: string;
  total_earned: number;
  developer_share: number;
  platform_fee: number;
  buyers: string[];
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  pi_wallet_address?: string | null;
}

export default function DeveloperDashboard() {
  const { user, loading } = useAuth();
  
  const [earnings, setEarnings] = useState<EarningsSummary[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [totalGross, setTotalGross] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPlatformFee, setTotalPlatformFee] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [openPayAccount, setOpenPayAccount] = useState('');
  const [openPayUsername, setOpenPayUsername] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { piUser, isPiReady, authenticateWithPi, piLoading } = usePiNetwork();
  

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      const { data: earningsData } = await supabase
        .from('developer_earnings')
        .select('app_id, payment_id, total_amount, developer_share, platform_fee')
        .eq('developer_id', user.id);

      const appIds = [...new Set(earningsData?.map((e) => e.app_id) || [])];
      const paymentIds = [...new Set((earningsData || []).map((e: any) => e.payment_id).filter(Boolean))];
      const { data: appsData } = appIds.length > 0
        ? await supabase.from('apps').select('id, name').in('id', appIds)
        : { data: [] };
      const { data: paymentData } = paymentIds.length > 0
        ? await supabase.from('pi_payments').select('id, metadata').in('id', paymentIds)
        : { data: [] };

      const appNameMap = new Map<string, string>(appsData?.map((a) => [a.id, a.name] as [string, string]) || []);
      const paymentMetaMap = new Map<string, any>((paymentData || []).map((p: any) => [p.id, p.metadata]));

      const grouped: Record<string, EarningsSummary> = {};
      earningsData?.forEach((e) => {
        if (!grouped[e.app_id]) {
          grouped[e.app_id] = {
            app_id: e.app_id,
            app_name: appNameMap.get(e.app_id) || 'Unknown App',
            total_earned: 0,
            developer_share: 0,
            platform_fee: 0,
            buyers: [],
          };
        }
        grouped[e.app_id].total_earned += Number(e.total_amount);
        grouped[e.app_id].developer_share += Number(e.developer_share);
        grouped[e.app_id].platform_fee += Number(e.platform_fee);
        const meta = paymentMetaMap.get((e as any).payment_id);
        const buyerUsername = meta?.buyer_pi_username;
        if (buyerUsername && !grouped[e.app_id].buyers.includes(buyerUsername)) {
          grouped[e.app_id].buyers.push(buyerUsername);
        }
      });

      const summaries = Object.values(grouped);
      setEarnings(summaries);
      setTotalGross(summaries.reduce((sum, e) => sum + e.total_earned, 0));
      setTotalEarned(summaries.reduce((sum, e) => sum + e.developer_share, 0));
      setTotalPlatformFee(summaries.reduce((sum, e) => sum + e.platform_fee, 0));

      const { data: withdrawalData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false });

      setWithdrawals(withdrawalData || []);
      setTotalWithdrawn(
        (withdrawalData || [])
          .filter((w) => w.status === 'completed')
          .reduce((sum, w) => sum + Number(w.amount), 0)
      );
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const availableBalance = totalEarned - totalWithdrawn;

  const handleWithdraw = async () => {
    if (!user) return;

    // Require Pi authentication for A2U payout
    if (!piUser) {
      toast.error('Please authenticate with Pi first to enable A2U payouts');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          developer_id: user.id,
          amount,
          status: 'pending',
          pi_wallet_address: openPayUsername.trim() && openPayAccount.trim()
            ? `${openPayUsername.trim()} | ${openPayAccount.trim()}`
            : null,
          pi_uid: piUser.uid,
        } as any);

      if (error) throw error;

      toast.success('Withdrawal request submitted');
      setWithdrawAmount('');
      setOpenPayAccount('');
      setOpenPayUsername('');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Sign in Required</h1>
          <Link to="/auth"><Button>Sign In</Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">Developer Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Withdraw earnings via OpenPay wallet
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          <div className="rounded-2xl bg-card p-4 border border-border text-center">
            <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-xl font-bold text-foreground">{totalGross.toFixed(2)} pi</p>
          </div>
          <div className="rounded-2xl bg-card p-4 border border-border text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Developer (70%)</p>
            <p className="text-xl font-bold text-foreground">{totalEarned.toFixed(2)} pi</p>
          </div>
          <div className="rounded-2xl bg-card p-4 border border-border text-center">
            <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Platform Fee (30%)</p>
            <p className="text-xl font-bold text-foreground">{totalPlatformFee.toFixed(2)} pi</p>
          </div>
          <div className="rounded-2xl bg-card p-4 border border-border text-center">
            <Wallet className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-xl font-bold text-foreground">{availableBalance.toFixed(2)} pi</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-6">Revenue split: 70% Developer / 30% Platform Fee</p>

        <div className="rounded-2xl bg-card p-6 border border-border mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Withdraw Earnings</h2>
          
          {/* Pi authentication for A2U payouts */}
          {isPiReady && !piUser && (
            <div className="mb-4 p-3 rounded-xl bg-secondary/50 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Authenticate with Pi to enable withdrawals via A2U</p>
              <Button size="sm" variant="outline" onClick={authenticateWithPi} disabled={piLoading}>
                {piLoading ? 'Connecting...' : 'Connect Pi'}
              </Button>
            </div>
          )}
          {!isPiReady && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-muted-foreground">Pi SDK not available. Please open this app in Pi Browser to withdraw.</p>
            </div>
          )}
          {piUser && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-foreground">✅ Pi connected: <span className="font-mono font-medium">@{piUser.username}</span> — withdrawals will be sent via A2U</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>OpenPay @Username (optional)</Label>
              <Input
                value={openPayUsername}
                onChange={(e) => setOpenPayUsername(e.target.value)}
                placeholder="@yourusername"
              />
            </div>
            <div className="space-y-2">
              <Label>OpenPay Account Number (optional)</Label>
              <Input
                value={openPayAccount}
                onChange={(e) => setOpenPayAccount(e.target.value)}
                placeholder="Enter account number"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (Pi)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={availableBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Max: ${availableBalance.toFixed(2)}`}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleWithdraw} disabled={isWithdrawing || availableBalance <= 0 || !piUser}>
              {isWithdrawing ? 'Processing...' : 'Withdraw via A2U'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 border border-border mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Earnings by App</h2>
          {loadingData ? (
            <PageLoader label="Loading dashboard..." fullscreen={false} />
          ) : earnings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No earnings yet. Submit an app and start earning.</p>
          ) : (
            <div className="space-y-3">
              {earnings.map((e) => (
                <div key={e.app_id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div>
                    <p className="font-medium text-foreground">{e.app_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Total: {e.total_earned.toFixed(2)} pi | Fee: {e.platform_fee.toFixed(2)} pi
                    </p>
                    {e.buyers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Buyers: {e.buyers.map((u) => `@${u}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-primary">{e.developer_share.toFixed(2)} pi</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-card p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Withdrawal History</h2>
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-sm">No withdrawals yet.</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div>
                    <p className="font-medium text-foreground">{Number(w.amount).toFixed(2)} pi</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString()} {w.pi_wallet_address ? `| ${w.pi_wallet_address}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    w.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    w.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
