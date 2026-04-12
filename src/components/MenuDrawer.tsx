import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Menu,
  Home,
  Grid3X3,
  Sun,
  Moon,
  Megaphone,
  BarChart3,
  Shield,
  FileText,
  Scale,
  ShieldCheck,
  Info,
  LogIn,
  LogOut,
  PlusCircle,
  AppWindow,
  User,
  Bookmark,
  MessageSquare,
  Sparkles,
  Trophy,
  Code2,
  Receipt,
  BookOpen,
  Send,
} from 'lucide-react';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

function MenuItem({ icon, label, href, onClick, isActive }: MenuItemProps) {
  const content = (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-secondary text-foreground'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );

  if (href) {
    if (href.startsWith('http')) {
      return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
    }
    return <Link to={href}>{content}</Link>;
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

export function MenuDrawer() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left">OpenApp</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <MenuItem icon={<Home className="h-5 w-5" />} label="Home" href="/" />
          <MenuItem icon={<Grid3X3 className="h-5 w-5" />} label="Browse Apps" href="/" />
          <MenuItem icon={<Sparkles className="h-5 w-5" />} label="New Apps" href="/new" />
          <MenuItem icon={<Trophy className="h-5 w-5" />} label="Top Apps" href="/top" />
          <MenuItem icon={<PlusCircle className="h-5 w-5" />} label="Submit App" href="/submit" />
          {user && <MenuItem icon={<Bookmark className="h-5 w-5" />} label="Favorites" href="/bookmarks" />}
          <MenuItem icon={<MessageSquare className="h-5 w-5" />} label="Feedback" href="/feedback" />
          <MenuItem icon={<BookOpen className="h-5 w-5" />} label="Blog" href="/blog" />
          {user && <MenuItem icon={<Receipt className="h-5 w-5" />} label="Purchases" href="/purchases" />}
          {user && <MenuItem icon={<User className="h-5 w-5" />} label="Profile" href="/profile" />}

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">Developer</p>
            <MenuItem icon={<Code2 className="h-5 w-5" />} label="Developer Dashboard" href="/developer-dashboard" />
            {user && <MenuItem icon={<AppWindow className="h-5 w-5" />} label="My Apps" href="/my-apps" />}
          </div>

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">Ad Network</p>
            <MenuItem icon={<Megaphone className="h-5 w-5" />} label="Advertiser Dashboard" href="/advertiser" />
            <MenuItem icon={<BarChart3 className="h-5 w-5" />} label="Analytics" href="/analytics" />
          </div>

          {isAdmin && (
            <div className="border-t border-border mt-2 pt-3 space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">Admin</p>
              <MenuItem icon={<Shield className="h-5 w-5" />} label="App Moderation" href="/admin" />
              <MenuItem icon={<Shield className="h-5 w-5" />} label="Ad Moderation" href="/ad-moderation" />
              <MenuItem icon={<Send className="h-5 w-5" />} label="A2U Payments" href="/admin" />
              <MenuItem icon={<BookOpen className="h-5 w-5" />} label="Blog Manager" href="/admin/blog" />
            </div>
          )}

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">Legal</p>
            <MenuItem icon={<Info className="h-5 w-5" />} label="About OpenApp" href="/about" />
            <MenuItem icon={<ShieldCheck className="h-5 w-5" />} label="Privacy Policy" href="/privacy" />
            <MenuItem icon={<Scale className="h-5 w-5" />} label="Terms of Service" href="/terms" />
            <MenuItem icon={<FileText className="h-5 w-5" />} label="License" href="/license" />
          </div>

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <MenuItem
              icon={theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              onClick={toggleTheme}
            />
            {user ? (
              <MenuItem icon={<LogOut className="h-5 w-5" />} label="Sign Out" onClick={signOut} />
            ) : (
              <MenuItem icon={<LogIn className="h-5 w-5" />} label="Sign In" href="/auth" />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
