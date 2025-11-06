import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ReportStatCardProps {
  icon?: LucideIcon;
  title: string;
  value: string;
  description?: string;
  variant?: 'default' | 'small';
}

export function ReportStatCard({ icon: Icon, title, value, description, variant = 'default' }: ReportStatCardProps) {
  const isSmall = variant === 'small';
  return (
    <Card className={cn(isSmall && 'shadow-none border-0')}>
      <CardHeader className={cn("flex flex-row items-center justify-between pb-2", isSmall ? 'p-2' : 'p-6')}>
        <CardTitle className={cn("font-medium text-muted-foreground", isSmall ? 'text-sm' : 'text-base')}>
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("text-muted-foreground", isSmall ? 'h-4 w-4' : 'h-5 w-5')} />}
      </CardHeader>
      <CardContent className={isSmall ? 'p-2 pt-0' : 'p-6 pt-0'}>
        <div className={cn("font-bold", isSmall ? 'text-xl' : 'text-3xl')}>{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
